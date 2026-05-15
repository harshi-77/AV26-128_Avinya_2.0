from __future__ import annotations

from pathlib import Path

from torchvision import datasets, transforms
from torch.utils.data import DataLoader, random_split


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def is_valid_image_file(path: str) -> bool:
    file_path = Path(path)
    if file_path.name.startswith("._") or file_path.name.startswith("."):
        return False
    return file_path.suffix.lower() in IMAGE_EXTENSIONS


def find_dataset_dir(project_root: Path, candidates: list[str]) -> Path:
    for candidate in candidates:
        path = project_root / "dataset" / candidate
        if path.exists():
            return path
    raise FileNotFoundError(f"Could not find dataset folder. Tried: {', '.join(candidates)}")


def has_split_dirs(dataset_dir: Path) -> bool:
    names = {child.name.lower() for child in dataset_dir.iterdir() if child.is_dir()}
    return {"train", "valid"}.issubset(names) or {"train", "val"}.issubset(names)


def has_training_testing_dirs(dataset_dir: Path) -> bool:
    names = {child.name.lower() for child in dataset_dir.iterdir() if child.is_dir()}
    return "training" in names and "testing" in names


def train_transforms(image_size: int):
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=8),
            transforms.ColorJitter(brightness=0.08, contrast=0.08),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def eval_transforms(image_size: int):
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def create_dataloaders(
    dataset_dir: Path,
    image_size: int,
    batch_size: int,
    num_workers: int,
    val_ratio: float = 0.15,
    test_ratio: float = 0.10,
) -> tuple[DataLoader, DataLoader, DataLoader | None, list[str]]:
    if has_split_dirs(dataset_dir):
        train_dir = dataset_dir / "train"
        valid_dir = dataset_dir / "valid"
        if not valid_dir.exists():
            valid_dir = dataset_dir / "val"
        test_dir = dataset_dir / "test"

        train_dataset = datasets.ImageFolder(train_dir, transform=train_transforms(image_size), is_valid_file=is_valid_image_file)
        valid_dataset = datasets.ImageFolder(valid_dir, transform=eval_transforms(image_size), is_valid_file=is_valid_image_file)
        test_dataset = (
            datasets.ImageFolder(test_dir, transform=eval_transforms(image_size), is_valid_file=is_valid_image_file)
            if test_dir.exists()
            else None
        )
        labels = train_dataset.classes
    elif has_training_testing_dirs(dataset_dir):
        train_source = datasets.ImageFolder(dataset_dir / "Training", transform=train_transforms(image_size), is_valid_file=is_valid_image_file)
        labels = train_source.classes
        val_size = max(1, int(len(train_source) * val_ratio))
        train_size = len(train_source) - val_size
        if train_size <= 0:
            raise ValueError("Training split is too small for validation split")
        train_dataset, valid_dataset = random_split(train_source, [train_size, val_size])
        valid_dataset.dataset.transform = eval_transforms(image_size)
        test_dataset = datasets.ImageFolder(dataset_dir / "Testing", transform=eval_transforms(image_size), is_valid_file=is_valid_image_file)
    elif (dataset_dir / "train").exists():
        train_source = datasets.ImageFolder(dataset_dir / "train", transform=train_transforms(image_size), is_valid_file=is_valid_image_file)
        labels = train_source.classes
        total = len(train_source)
        test_size = max(1, int(total * test_ratio))
        val_size = max(1, int(total * val_ratio))
        train_size = total - val_size - test_size
        if train_size <= 0:
            raise ValueError("Train folder is too small for train/validation/test split")
        train_dataset, valid_dataset, test_dataset = random_split(train_source, [train_size, val_size, test_size])
        valid_dataset.dataset.transform = eval_transforms(image_size)
        test_dataset.dataset.transform = eval_transforms(image_size)
    else:
        dataset = datasets.ImageFolder(dataset_dir, transform=train_transforms(image_size), is_valid_file=is_valid_image_file)
        labels = dataset.classes
        total = len(dataset)
        test_size = max(1, int(total * test_ratio))
        val_size = max(1, int(total * val_ratio))
        train_size = total - val_size - test_size
        if train_size <= 0:
            raise ValueError("Dataset is too small for train/validation/test split")
        train_dataset, valid_dataset, test_dataset = random_split(dataset, [train_size, val_size, test_size])
        valid_dataset.dataset.transform = eval_transforms(image_size)
        test_dataset.dataset.transform = eval_transforms(image_size)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True)
    valid_loader = DataLoader(valid_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)
    test_loader = (
        DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True)
        if test_dataset is not None
        else None
    )
    return train_loader, valid_loader, test_loader, labels
