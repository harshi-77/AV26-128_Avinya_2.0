from fastapi import APIRouter

from app.services.model_registry import model_registry

router = APIRouter(tags=["models"])


@router.get("/models")
async def models():
    return {
        "loaded_models": model_registry.info(),
        "supported_scan_types": ["X-ray", "MRI", "CT Scan"],
    }
