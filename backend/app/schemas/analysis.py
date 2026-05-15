from pydantic import BaseModel, Field


class AnalysisResponse(BaseModel):
    scan_type: str = Field(..., examples=["MRI"])
    prediction: str = Field(..., examples=["Brain Tumor Detected"])
    confidence: float = Field(..., ge=0, le=100, examples=[98.4])
    detected_abnormality: str = Field(..., examples=["Tumor"])
    severity: str = Field(..., examples=["High"])
    processing_time: str = Field(..., examples=["1.20s"])
    heatmap_url: str | None = None
    model_version: str | None = None
    labels: list[str] = []
