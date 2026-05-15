from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def _filename_hint(filename: str | None) -> str | None:
    if not filename:
        return None
    name = filename.lower()
    if any(token in name for token in ["xray", "x-ray", "xr_", "radiograph"]):
        return "xray"
    if any(token in name for token in ["mri", "mr_", "brain"]):
        return "mri"
    if any(token in name for token in ["ct", "ctscan", "ct-scan", "tomography"]):
        return "ctscan"
    return None


def detect_modality(image_path: Path, original_filename: str | None = None) -> tuple[str, float]:
    hinted = _filename_hint(original_filename or image_path.name)
    if hinted:
        return hinted, 0.92

    image = Image.open(image_path).convert("RGB").resize((256, 256))
    arr = np.asarray(image)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    gray_float = gray.astype(np.float32) / 255.0

    color_variance = float(np.mean(np.std(arr.astype(np.float32) / 255.0, axis=2)))
    edge_density = float(np.mean(cv2.Canny(gray, 45, 120) > 0))
    dark_border = float(
        np.mean(
            np.concatenate(
                [gray_float[:20, :].ravel(), gray_float[-20:, :].ravel(), gray_float[:, :20].ravel(), gray_float[:, -20:].ravel()]
            )
        )
    )

    _, thresh = cv2.threshold(gray, 18, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    circularity = 0.0
    if contours:
        contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = float(4 * np.pi * area / (perimeter * perimeter))

    scores = {
        "xray": 0.35 + edge_density * 2.0 + (1 - dark_border) * 0.35 - color_variance * 0.6,
        "mri": 0.35 + dark_border * 0.65 + edge_density * 0.7 + (1 - circularity) * 0.25,
        "ctscan": 0.30 + dark_border * 0.8 + circularity * 0.75 + edge_density * 0.25,
    }
    modality = max(scores, key=scores.get)
    raw = np.array(list(scores.values()), dtype=np.float32)
    exp = np.exp(raw - raw.max())
    confidence = float(exp.max() / exp.sum())
    return modality, round(confidence, 3)
