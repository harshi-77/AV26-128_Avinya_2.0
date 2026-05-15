from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

import torch
from PIL import Image
from torch import nn, optim
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.cnn import build_model
from training.evaluate import evaluate_model
from training.preprocessing import create_dataloaders, eval_transforms, find_dataset_dir, is_valid_image_file, train_transforms
from training.trainer import plot_history, run_epoch


MURA_LABELS = ["normal", "abnormal"]


def _resolve_mura_path(dataset_dir: Path, csv_path: str) -> Path:
    relative = csv_path.strip().replace("\\", "/")
    if relative.startswith("MURA-v1.1/"):
        relative = relative.removeprefix("MURA-v1.1/")
    return dataset_dir / relative


def _read_split(dataset_dir: Path, split: str, max_samples: int | None = None) -> list[tuple[Path, int]]:
    csv_file = dataset_dir / f"{split}_image_paths.csv"
    if not csv_file.exists():
        raise FileNotFoundError(f"Missing MURA image list: {csv_file}")

    samples: list[tuple[Path, int]] = []
    for line in csv_file.read_text(encoding="utf-8").splitlines():
        raw_path = line.strip()
        if not raw_path:
            continue
        image_path = _resolve_mura_path(dataset_dir, raw_path)
        if not image_path.exists() or not is_valid_image_file(str(image_path)):
            continue
        label = 1 if "positive" in raw_path.lower() else 0
        samples.append((image_path, label))

    if max_samples and max_samples > 0 and len(samples) > max_samples:
        rng = random.Random(42)
        by_class = {0: [], 1: []}
        for sample in samples:
            by_class[sample[1]].append(sample)
        per_class = max_samples // 2
        balanced = []
        for label_samples in by_class.values():
            rng.shuffle(label_samples)
            balanced.extend(label_samples[:per_class])
        rng.shuffle(balanced)
        return balanced

    return samples


class MuraXrayDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], image_size: int, train: bool):
        self.samples = samples
        self.transform = train_transforms(image_size) if train else eval_transforms(image_size)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        image_path, label = self.samples[index]
        image = Image.open(image_path).convert("RGB")
        return self.transform(image), label


def _sampler(samples: list[tuple[Path, int]]) -> WeightedRandomSampler:
    counts = {0: 0, 1: 0}
    for _, label in samples:
        counts[label] += 1
    weights = [1.0 / max(counts[label], 1) for _, label in samples]
    return WeightedRandomSampler(torch.DoubleTensor(weights), num_samples=len(weights), replacement=True)


def _stratified_split(samples: list[tuple[Path, int]], val_ratio: float = 0.15) -> tuple[list[tuple[Path, int]], list[tuple[Path, int]]]:
    rng = random.Random(42)
    by_class = {0: [], 1: []}
    for sample in samples:
        by_class[sample[1]].append(sample)

    train_samples: list[tuple[Path, int]] = []
    valid_samples: list[tuple[Path, int]] = []
    for label_samples in by_class.values():
        rng.shuffle(label_samples)
        val_size = max(1, int(len(label_samples) * val_ratio))
        valid_samples.extend(label_samples[:val_size])
        train_samples.extend(label_samples[val_size:])

    rng.shuffle(train_samples)
    rng.shuffle(valid_samples)
    return train_samples, valid_samples


def parse_args():
    parser = argparse.ArgumentParser(description="Train X-ray classifier on balanced_train or the MURA dataset")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--dataset-dir", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--image-size", type=int, default=160)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--architecture", choices=["efficientnet_b0", "resnet18"], default="resnet18")
    parser.add_argument("--pretrained", action="store_true")
    parser.add_argument("--max-samples", type=int, default=0, help="Optional balanced training subset for faster experiments")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset_dir = args.dataset_dir or find_dataset_dir(args.project_root, ["x-ray/balanced_train", "xray/balanced_train", "xray", "x-ray/X-ray", "Data/X-ray", "x-ray", "X-ray"])
    output_dir = args.output_dir or args.project_root / "backend" / "saved_models" / "xray"
    output_dir.mkdir(parents=True, exist_ok=True)

    started = time.time()
    is_mura_dataset = (dataset_dir / "train_image_paths.csv").exists()
    test_loader = None

    if is_mura_dataset:
        labels = MURA_LABELS
        train_samples = _read_split(dataset_dir, "train", args.max_samples or None)
        valid_samples = _read_split(dataset_dir, "valid")
        if not valid_samples:
            print("No valid image files found on disk; creating a stratified validation split from train images.")
            train_samples, valid_samples = _stratified_split(train_samples)

        if not train_samples or not valid_samples:
            raise RuntimeError("No X-ray samples found. Expected MURA train/valid CSV files and images.")

        train_dataset = MuraXrayDataset(train_samples, args.image_size, train=True)
        valid_dataset = MuraXrayDataset(valid_samples, args.image_size, train=False)
        train_loader = DataLoader(
            train_dataset,
            batch_size=args.batch_size,
            sampler=_sampler(train_samples),
            num_workers=args.num_workers,
            pin_memory=True,
        )
        valid_loader = DataLoader(valid_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers, pin_memory=True)
        train_sample_count = len(train_samples)
        valid_sample_count = len(valid_samples)
    else:
        print(f"Using balanced X-ray image-folder dataset: {dataset_dir}")
        train_loader, valid_loader, test_loader, labels = create_dataloaders(
            dataset_dir=dataset_dir,
            image_size=args.image_size,
            batch_size=args.batch_size,
            num_workers=args.num_workers,
        )
        train_sample_count = len(train_loader.dataset)
        valid_sample_count = len(valid_loader.dataset)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(len(labels), architecture=args.architecture, pretrained=args.pretrained).to(device)
    if is_mura_dataset:
        class_counts = torch.tensor(
            [sum(label == class_index for _, label in train_samples) for class_index in range(len(labels))],
            dtype=torch.float32,
            device=device,
        )
        class_weights = class_counts.sum() / (class_counts * len(labels)).clamp_min(1)
        criterion = nn.CrossEntropyLoss(weight=class_weights)
    else:
        criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.35, patience=1)

    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}
    best_val_acc = 0.0
    best_epoch = 0
    stale_epochs = 0

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = run_epoch(model, valid_loader, criterion, None, device)
        scheduler.step(val_acc)

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        print(
            f"Epoch {epoch:03d}/{args.epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            stale_epochs = 0
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "labels": labels,
                    "architecture": args.architecture,
                    "val_accuracy": best_val_acc,
                    "epoch": epoch,
                },
                output_dir / "best_model.pt",
            )
        else:
            stale_epochs += 1
            if stale_epochs >= args.patience:
                print(f"Early stopping at epoch {epoch}; best epoch was {best_epoch}")
                break

    plot_history(history, output_dir)
    if (output_dir / "best_model.pt").exists():
        checkpoint = torch.load(output_dir / "best_model.pt", map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        validation_metrics = evaluate_model(model, valid_loader, labels, device, output_dir)
    else:
        validation_metrics = {}

    metadata = {
        "modality_key": "xray",
        "labels": labels,
        "architecture": args.architecture,
        "image_size": args.image_size,
        "best_val_accuracy": best_val_acc,
        "best_epoch": best_epoch,
        "dataset_dir": str(dataset_dir),
        "train_samples": train_sample_count,
        "valid_samples": valid_sample_count,
        "test_samples": len(test_loader.dataset) if test_loader is not None else 0,
        "training_seconds": round(time.time() - started, 2),
        "version": "1.1.0",
        "task": "binary_normal_abnormal" if is_mura_dataset else "balanced_xray_region_classifier",
        "validation_metrics": validation_metrics,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved X-ray abnormality model and metadata to {output_dir}")


if __name__ == "__main__":
    main()
