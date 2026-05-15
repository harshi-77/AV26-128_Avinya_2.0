from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import matplotlib.pyplot as plt
import torch
from torch import nn, optim

from app.models.cnn import build_model
from training.evaluate import evaluate_model
from training.preprocessing import create_dataloaders, find_dataset_dir


def parse_args(default_modality: str, default_candidates: list[str]):
    parser = argparse.ArgumentParser(description=f"Train {default_modality} medical image classifier")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--dataset-dir", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--architecture", choices=["efficientnet_b0", "resnet18"], default="efficientnet_b0")
    parser.add_argument("--pretrained", action="store_true")
    parser.add_argument("--candidates", nargs="*", default=default_candidates)
    parser.add_argument("--modality-key", default=default_modality)
    return parser.parse_args()


def plot_history(history: dict[str, list[float]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].plot(history["train_loss"], label="train")
    axes[0].plot(history["val_loss"], label="validation")
    axes[0].set_title("Loss")
    axes[0].legend()
    axes[1].plot(history["train_acc"], label="train")
    axes[1].plot(history["val_acc"], label="validation")
    axes[1].set_title("Accuracy")
    axes[1].legend()
    fig.tight_layout()
    fig.savefig(output_dir / "training_curves.png", dpi=160)
    plt.close(fig)


def run_epoch(model, dataloader, criterion, optimizer, device: torch.device | None = None):
    is_train = optimizer is not None
    model.train(is_train)
    total_loss = 0.0
    correct = 0
    total = 0

    for images, targets in dataloader:
        images = images.to(device)
        targets = targets.to(device)

        if is_train:
            optimizer.zero_grad(set_to_none=True)

        with torch.set_grad_enabled(is_train):
            logits = model(images)
            loss = criterion(logits, targets)
            if is_train:
                loss.backward()
                optimizer.step()

        total_loss += loss.item() * images.size(0)
        correct += (torch.argmax(logits, dim=1) == targets).sum().item()
        total += images.size(0)

    return total_loss / max(total, 1), correct / max(total, 1)


def train_modality(args) -> None:
    project_root = args.project_root
    dataset_dir = args.dataset_dir or find_dataset_dir(project_root, args.candidates)
    output_dir = args.output_dir or project_root / "backend" / "saved_models" / args.modality_key
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader, valid_loader, test_loader, labels = create_dataloaders(
        dataset_dir=dataset_dir,
        image_size=args.image_size,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
    )

    model = build_model(len(labels), architecture=args.architecture, pretrained=args.pretrained).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.3, patience=2)

    best_val_acc = 0.0
    best_epoch = 0
    stale_epochs = 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    started = time.time()
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

    metadata = {
        "modality_key": args.modality_key,
        "labels": labels,
        "architecture": args.architecture,
        "image_size": args.image_size,
        "best_val_accuracy": best_val_acc,
        "best_epoch": best_epoch,
        "dataset_dir": str(dataset_dir),
        "training_seconds": round(time.time() - started, 2),
        "version": "1.0.0",
    }

    if test_loader is not None and (output_dir / "best_model.pt").exists():
        checkpoint = torch.load(output_dir / "best_model.pt", map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        metadata["test_metrics"] = evaluate_model(model, test_loader, labels, device, output_dir)

    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved best model and metadata to {output_dir}")
