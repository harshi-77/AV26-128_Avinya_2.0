from __future__ import annotations

import torch
from torch import nn
from torchvision import models


class MedicalImageClassifier(nn.Module):
    def __init__(self, num_classes: int, architecture: str = "efficientnet_b0", pretrained: bool = False):
        super().__init__()
        self.architecture = architecture

        if architecture == "resnet18":
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet18(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Linear(in_features, num_classes)
            self.gradcam_layer_name = "layer4"
        else:
            weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier[1] = nn.Linear(in_features, num_classes)
            self.gradcam_layer_name = "features"

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


def build_model(num_classes: int, architecture: str = "efficientnet_b0", pretrained: bool = False) -> MedicalImageClassifier:
    return MedicalImageClassifier(num_classes=num_classes, architecture=architecture, pretrained=pretrained)
