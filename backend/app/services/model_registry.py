from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import torch

from app.config import get_settings
from app.models.cnn import build_model

logger = logging.getLogger("medai.models")

MODALITIES = {
    "modality": "Scan Modality",
    "xray": "X-ray",
    "mri": "MRI",
    "ctscan": "CT Scan",
}


@dataclass
class LoadedModel:
    key: str
    display_name: str
    model: torch.nn.Module
    labels: list[str]
    architecture: str
    image_size: int
    version: str
    path: Path
    device: torch.device


class ModelRegistry:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.models: dict[str, LoadedModel] = {}

    def load_all(self, saved_models_dir: Path) -> None:
        self.models.clear()
        for key, display_name in MODALITIES.items():
            try:
                self.load_one(key, display_name, saved_models_dir)
            except FileNotFoundError:
                logger.warning("No saved model found for %s", display_name)
            except Exception:
                logger.exception("Failed to load model for %s", display_name)

    def load_one(self, key: str, display_name: str, saved_models_dir: Path) -> None:
        model_dir = saved_models_dir / key
        metadata_path = model_dir / "metadata.json"
        weights_path = model_dir / "best_model.pt"

        if not metadata_path.exists() or not weights_path.exists():
            raise FileNotFoundError(f"Missing model artifacts in {model_dir}")

        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        labels = metadata["labels"]
        architecture = metadata.get("architecture", "efficientnet_b0")
        model = build_model(num_classes=len(labels), architecture=architecture, pretrained=False)
        checkpoint = torch.load(weights_path, map_location=self.device)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()

        self.models[key] = LoadedModel(
            key=key,
            display_name=display_name,
            model=model,
            labels=labels,
            architecture=architecture,
            image_size=int(metadata.get("image_size", 224)),
            version=metadata.get("version", "1.0.0"),
            path=weights_path,
            device=self.device,
        )
        logger.info("Loaded %s model from %s", display_name, weights_path)

    def get(self, key: str) -> LoadedModel | None:
        return self.models.get(key)

    def info(self) -> list[dict]:
        return [
            {
                "key": item.key,
                "scan_type": item.display_name,
                "architecture": item.architecture,
                "image_size": item.image_size,
                "version": item.version,
                "labels": item.labels,
                "path": str(item.path),
                "device": str(item.device),
                "loaded": True,
            }
            for item in self.models.values()
        ]

    def fallback_allowed(self) -> bool:
        return get_settings().allow_untrained_fallback


model_registry = ModelRegistry()
