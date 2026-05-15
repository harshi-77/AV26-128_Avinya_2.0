import time
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas.analysis import AnalysisResponse
from app.services.inference_service import analyze_image
from app.utils.image_utils import InvalidImageError, validate_upload

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...), scan_type: str | None = Form(None)):
    settings = get_settings()
    started = time.perf_counter()

    try:
        content = await file.read()
        validate_upload(file.filename or "scan", content, settings.max_upload_mb)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    suffix = Path(file.filename or "scan.png").suffix or ".png"
    stored_path = settings.upload_dir / f"{uuid4().hex}{suffix.lower()}"
    stored_path.write_bytes(content)

    try:
        filename_hint = "_".join(part for part in [scan_type, file.filename] if part)
        result = analyze_image(stored_path, original_filename=filename_hint or file.filename)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result.processing_time = f"{time.perf_counter() - started:.2f}s"
    return result
