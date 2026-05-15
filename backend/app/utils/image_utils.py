from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from torchvision import transforms


class InvalidImageError(ValueError):
    pass


ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".dcm", ".dicom"}


def validate_upload(filename: str, content: bytes, max_upload_mb: int) -> None:
    if not content:
        raise InvalidImageError("Uploaded file is empty")
    if len(content) > max_upload_mb * 1024 * 1024:
        raise InvalidImageError(f"File exceeds {max_upload_mb} MB limit")
    suffix = Path(filename).suffix.lower()
    if suffix and suffix not in ALLOWED_SUFFIXES:
        raise InvalidImageError("Unsupported file type. Use JPG, PNG, TIFF, BMP, or DICOM")


def open_medical_image(path: Path) -> Image.Image:
    suffix = path.suffix.lower()
    if suffix in {".dcm", ".dicom"}:
        try:
            import pydicom
        except ImportError as exc:
            raise InvalidImageError("DICOM upload requires pydicom to be installed") from exc

        dataset = pydicom.dcmread(str(path))
        pixels = dataset.pixel_array.astype(np.float32)
        pixels -= pixels.min()
        if pixels.max() > 0:
            pixels /= pixels.max()
        pixels = (pixels * 255).astype(np.uint8)
        return Image.fromarray(pixels).convert("RGB")

    try:
        return Image.open(path).convert("RGB")
    except UnidentifiedImageError as exc:
        raise InvalidImageError("Uploaded file is not a valid image") from exc


def load_image_tensor(path: Path, image_size: int) -> tuple[torch.Tensor, np.ndarray]:
    image = open_medical_image(path)
    original = np.asarray(image.resize((image_size, image_size)))
    transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return transform(image).unsqueeze(0), original


def save_confusion_matrix_image(matrix: np.ndarray, labels: list[str], output_path: Path) -> None:
    import matplotlib.pyplot as plt

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(max(6, len(labels)), max(5, len(labels) * 0.75)))
    im = ax.imshow(matrix, cmap="Blues")
    ax.figure.colorbar(im, ax=ax)
    ax.set_xticks(np.arange(len(labels)), labels=labels, rotation=45, ha="right")
    ax.set_yticks(np.arange(len(labels)), labels=labels)
    ax.set_ylabel("True label")
    ax.set_xlabel("Predicted label")
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            ax.text(j, i, matrix[i, j], ha="center", va="center", color="black")
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def cv2_png_bytes(image: np.ndarray) -> tuple[bool, bytes]:
    success, encoded = cv2.imencode(".png", cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
    return bool(success), encoded.tobytes() if success else b""
