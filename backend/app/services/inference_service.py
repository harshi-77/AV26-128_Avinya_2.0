from __future__ import annotations

import base64
import time
from pathlib import Path

import numpy as np
import torch
from torch.nn import functional as F

from app.config import get_settings
from app.schemas.analysis import AnalysisResponse
from app.services.modality_detector import detect_modality
from app.services.model_registry import MODALITIES, model_registry
from app.utils.gradcam import build_gradcam_overlay
from app.utils.image_utils import load_image_tensor


def _severity(confidence: float, label: str) -> str:
    normalized = label.lower()
    if "normal" in normalized or "healthy" in normalized or "negative" in normalized or "notumor" in normalized or "no tumor" in normalized:
        return "Low"
    if normalized.startswith("xr_") or normalized.startswith("xr-"):
        return "Moderate"
    if normalized in {"forearm", "hand", "legfoot", "legknee", "foot", "knee"}:
        return "Moderate"
    if confidence >= 90:
        return "High"
    if confidence >= 70:
        return "Moderate"
    return "Low"


def _abnormality_from_label(label: str) -> str:
    normalized = label.replace("_", " ").replace("-", " ").strip()
    if any(token in normalized.lower() for token in ["normal", "healthy", "negative"]):
        return "No major abnormality detected"
    if label.lower().startswith(("xr_", "xr-")):
        region = normalized.removeprefix("XR ").strip()
        return f"Possible {region.title()} bone crack or damage"
    compact_region = normalized.lower().replace(" ", "")
    region_names = {
        "forearm": "forearm or arm",
        "hand": "hand",
        "legfoot": "foot",
        "legknee": "knee",
        "foot": "foot",
        "knee": "knee",
    }
    if compact_region in region_names:
        return f"Possible {region_names[compact_region]} bone crack or damage"
    if normalized.lower() in {"abnormal", "positive"}:
        return "Musculoskeletal abnormality detected"
    return normalized.title()


def _is_normal_label(label: str) -> bool:
    normalized = label.lower()
    return any(token in normalized for token in ["normal", "healthy", "negative", "notumor", "no tumor"])


def _fallback_response(modality_key: str, modality_confidence: float) -> AnalysisResponse:
    display_name = MODALITIES[modality_key]
    return AnalysisResponse(
        scan_type=display_name,
        prediction=f"{display_name} model not trained yet",
        confidence=round(modality_confidence * 100, 2),
        detected_abnormality="Training required before diagnostic inference",
        severity="Unknown",
        processing_time="0.00s",
        heatmap_url=None,
        model_version="untrained-fallback",
        labels=[],
    )


def analyze_image(image_path: Path, original_filename: str | None = None) -> AnalysisResponse:
    started = time.perf_counter()
    settings = get_settings()
    modality_key, modality_confidence = detect_modality(image_path, original_filename)
    modality_model = model_registry.get("modality")

    if modality_model is not None and modality_confidence < 0.90:
        modality_tensor, _ = load_image_tensor(image_path, image_size=modality_model.image_size)
        modality_tensor = modality_tensor.to(modality_model.device)
        with torch.no_grad():
            modality_logits = modality_model.model(modality_tensor)
            modality_probs = F.softmax(modality_logits, dim=1)[0].detach().cpu().numpy()
        modality_index = int(np.argmax(modality_probs))
        predicted_label = modality_model.labels[modality_index].lower().replace("-", "").replace("_", "")
        label_map = {"xray": "xray", "mri": "mri", "ctscan": "ctscan", "ct": "ctscan"}
        modality_key = label_map.get(predicted_label, modality_key)
        modality_confidence = float(modality_probs[modality_index])

    loaded = model_registry.get(modality_key)

    if loaded is None:
        if model_registry.fallback_allowed():
            return _fallback_response(modality_key, modality_confidence)
        raise RuntimeError(f"No trained model is loaded for {MODALITIES[modality_key]}")

    tensor, original = load_image_tensor(image_path, image_size=loaded.image_size or settings.image_size)
    tensor = tensor.to(loaded.device)

    with torch.no_grad():
        logits = loaded.model(tensor)
        probabilities = F.softmax(logits, dim=1)[0].detach().cpu().numpy()

    class_index = int(np.argmax(probabilities))
    confidence = float(probabilities[class_index] * 100)
    label = loaded.labels[class_index]
    prediction = _abnormality_from_label(label)
    detected_abnormality = prediction
    severity = _severity(confidence, label)

    if loaded.key == "xray" and _is_normal_label(label) and confidence < 90:
        prediction = "Indeterminate X-ray: possible fracture or alignment abnormality"
        detected_abnormality = "Possible musculoskeletal injury requires radiologist review"
        severity = "Moderate"

    heatmap_url = None
    try:
        overlay = build_gradcam_overlay(loaded.model, tensor, original, class_index, loaded.device)
        success, encoded = overlay
        if success:
            heatmap_url = "data:image/png;base64," + base64.b64encode(encoded).decode("utf-8")
    except Exception:
        heatmap_url = None

    return AnalysisResponse(
        scan_type=loaded.display_name,
        prediction=prediction,
        confidence=round(confidence, 2),
        detected_abnormality=detected_abnormality,
        severity=severity,
        processing_time=f"{time.perf_counter() - started:.2f}s",
        heatmap_url=heatmap_url,
        model_version=loaded.version,
        labels=loaded.labels,
    )
