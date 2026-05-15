from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix

from app.utils.image_utils import save_confusion_matrix_image


@torch.no_grad()
def evaluate_model(model, dataloader, labels: list[str], device: torch.device, output_dir: Path) -> dict:
    model.eval()
    all_preds: list[int] = []
    all_targets: list[int] = []

    for images, targets in dataloader:
        images = images.to(device)
        targets = targets.to(device)
        logits = model(images)
        preds = torch.argmax(logits, dim=1)
        all_preds.extend(preds.cpu().tolist())
        all_targets.extend(targets.cpu().tolist())

    matrix = confusion_matrix(all_targets, all_preds, labels=list(range(len(labels))))
    output_dir.mkdir(parents=True, exist_ok=True)
    save_confusion_matrix_image(matrix, labels, output_dir / "confusion_matrix.png")

    report = classification_report(all_targets, all_preds, target_names=labels, output_dict=True, zero_division=0)
    accuracy = float(np.mean(np.array(all_preds) == np.array(all_targets))) if all_targets else 0.0
    return {
        "accuracy": accuracy,
        "classification_report": report,
        "confusion_matrix": matrix.tolist(),
    }
