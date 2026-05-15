from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import torch
from PIL import Image
from torch import nn, optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import transforms

from app.models.cnn import build_model
from training.trainer import plot_history, run_epoch


LABELS = ["xray", "mri", "ctscan"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def valid_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTENSIONS and not path.name.startswith("._") and not path.name.startswith(".")


def collect_images(root: Path, max_per_class: int) -> list[tuple[Path, int]]:
    sources = {
        "xray": root / "dataset" / "x-ray" / "X-ray" / "train",
        "mri": root / "dataset" / "mri",
        "ctscan": root / "dataset" / "Data",
    }
    samples: list[tuple[Path, int]] = []
    rng = random.Random(42)
    for index, label in enumerate(LABELS):
        paths = [path for path in sources[label].rglob("*") if path.is_file() and valid_image(path)]
        rng.shuffle(paths)
        samples.extend((path, index) for path in paths[:max_per_class])
    rng.shuffle(samples)
    return samples


class ModalityDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], image_size: int, train: bool):
        self.samples = samples
        base = [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=0.35) if train else transforms.Lambda(lambda image: image),
            transforms.RandomRotation(6) if train else transforms.Lambda(lambda image: image),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
        self.transform = transforms.Compose(base)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


def main():
    parser = argparse.ArgumentParser(description="Train scan modality classifier")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--max-per-class", type=int, default=2500)
    parser.add_argument("--architecture", choices=["resnet18", "efficientnet_b0"], default="resnet18")
    parser.add_argument("--num-workers", type=int, default=0)
    args = parser.parse_args()

    started = time.time()
    samples = collect_images(args.project_root, args.max_per_class)
    if len(samples) < len(LABELS) * 10:
        raise RuntimeError("Not enough modality samples found for training")

    dataset = ModalityDataset(samples, args.image_size, train=True)
    val_size = max(3, int(len(dataset) * 0.15))
    train_size = len(dataset) - val_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    val_dataset.dataset = ModalityDataset([dataset.samples[i] for i in val_dataset.indices], args.image_size, train=False)
    val_dataset.indices = list(range(len(val_dataset.dataset.samples)))

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers, pin_memory=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(len(LABELS), architecture=args.architecture, pretrained=False).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}
    best_val_acc = 0.0
    output_dir = args.project_root / "backend" / "saved_models" / "modality"
    output_dir.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, None, device)
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)
        print(
            f"Epoch {epoch:03d}/{args.epochs} | "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "labels": LABELS,
                    "architecture": args.architecture,
                    "val_accuracy": best_val_acc,
                    "epoch": epoch,
                },
                output_dir / "best_model.pt",
            )

    plot_history(history, output_dir)
    metadata = {
        "modality_key": "modality",
        "labels": LABELS,
        "architecture": args.architecture,
        "image_size": args.image_size,
        "best_val_accuracy": best_val_acc,
        "dataset_size": len(samples),
        "training_seconds": round(time.time() - started, 2),
        "version": "1.0.0",
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved modality classifier to {output_dir}")


if __name__ == "__main__":
    main()
