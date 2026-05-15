from __future__ import annotations

import cv2
import numpy as np
import torch

from app.utils.image_utils import cv2_png_bytes


def _target_layer(model: torch.nn.Module) -> torch.nn.Module:
    if hasattr(model, "gradcam_layer_name"):
        layer = getattr(model.backbone, model.gradcam_layer_name)
        if isinstance(layer, torch.nn.Sequential):
            return layer[-1]
        return layer
    return list(model.modules())[-2]


def build_gradcam_overlay(
    model: torch.nn.Module,
    tensor: torch.Tensor,
    original_rgb: np.ndarray,
    class_index: int,
    device: torch.device,
) -> tuple[bool, bytes]:
    model.eval()
    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []
    layer = _target_layer(model)

    def forward_hook(_, __, output):
        activations.append(output.detach())

    def backward_hook(_, grad_input, grad_output):
        gradients.append(grad_output[0].detach())

    handle_fwd = layer.register_forward_hook(forward_hook)
    handle_bwd = layer.register_full_backward_hook(backward_hook)
    try:
        model.zero_grad(set_to_none=True)
        logits = model(tensor.to(device))
        score = logits[:, class_index].sum()
        score.backward()

        if not activations or not gradients:
            return False, b""

        acts = activations[-1]
        grads = gradients[-1]
        weights = grads.mean(dim=(2, 3), keepdim=True)
        cam = (weights * acts).sum(dim=1).squeeze()
        cam = torch.relu(cam).detach().cpu().numpy()
        cam -= cam.min()
        if cam.max() > 0:
            cam /= cam.max()

        heatmap = cv2.resize(cam, (original_rgb.shape[1], original_rgb.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = np.uint8(0.58 * original_rgb + 0.42 * heatmap)
        return cv2_png_bytes(overlay)
    finally:
        handle_fwd.remove()
        handle_bwd.remove()
