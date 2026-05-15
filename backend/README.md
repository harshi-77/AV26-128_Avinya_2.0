# AI Medical Imaging Diagnostics Backend

This backend powers the existing frontend without changing any frontend route, style, animation, or interaction.

It provides:

- `POST /analyze` for image upload and AI inference
- `GET /health` for service health
- `GET /models` for loaded model metadata
- Modality detection for X-ray, MRI, and CT scan images
- Optional trained modality classifier for more reliable automatic routing
- Dynamic routing to the correct trained model
- Separate training pipelines for X-ray, MRI, and CT
- Grad-CAM heatmap generation when a trained PyTorch model is available
- CORS support for frontend integration

## Folder Structure

```text
backend/
  app/
    main.py
    config.py
    routes/
    services/
    models/
    utils/
    schemas/
  training/
    train_modality.py
    train_xray.py
    train_mri.py
    train_ctscan.py
    train_all.py
    preprocessing.py
    evaluate.py
    trainer.py
  saved_models/
  uploads/
  requirements.txt
  README.md
```

## Dataset Layout

The training scripts support both the requested names and the current project aliases:

```text
dataset/xray/      or dataset/x-ray/ or dataset/Data/X-ray/
dataset/mri/
dataset/ctscan/    or dataset/Data/
```

Each modality folder should contain class-label folders, either directly:

```text
dataset/mri/
  normal/
  tumor/
```

or with train/validation/test splits:

```text
dataset/Data/
  train/
    normal/
    adenocarcinoma/
  valid/
    normal/
    adenocarcinoma/
  test/
    normal/
    adenocarcinoma/
```

## Install Dependencies

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

For GPU training, install the PyTorch build that matches your CUDA version from the official PyTorch selector, then install the remaining requirements.

## Train Models

Run from the `backend` folder.

Train all models, including the modality router:

```powershell
python -m training.train_all --epochs 20 --batch-size 16 --pretrained
```

Fast GPU smoke training:

```powershell
python -m training.train_all --epochs 1 --batch-size 64 --image-size 128 --architecture resnet18
```

Train individual models:

```powershell
python -m training.train_modality --epochs 1 --batch-size 64 --image-size 128 --architecture resnet18
python -m training.train_xray --epochs 20 --batch-size 16 --pretrained
python -m training.train_mri --epochs 20 --batch-size 16 --pretrained
python -m training.train_ctscan --epochs 20 --batch-size 16 --pretrained
```

If you want to point a model to a specific dataset folder:

```powershell
python -m training.train_ctscan --dataset-dir ..\dataset\Data --epochs 20 --batch-size 16 --pretrained
```

Training outputs are saved to:

```text
backend/saved_models/xray/
backend/saved_models/mri/
backend/saved_models/ctscan/
```

Each output directory contains:

- `best_model.pt`
- `metadata.json`
- `training_curves.png`
- `confusion_matrix.png` when a test split is available

## Run Backend Server

From the `backend` folder:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs:

```text
http://localhost:8000/docs
```

## Test APIs Locally

Health:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Loaded models:

```powershell
Invoke-RestMethod http://localhost:8000/models
```

Analyze image:

```powershell
curl.exe -X POST "http://localhost:8000/analyze" ^
  -F "file=@C:\path\to\scan.png"
```

Expected response:

```json
{
  "scan_type": "MRI",
  "prediction": "Brain Tumor Detected",
  "confidence": 98.4,
  "detected_abnormality": "Brain Tumor Detected",
  "severity": "High",
  "processing_time": "1.20s",
  "heatmap_url": "data:image/png;base64,...",
  "model_version": "1.0.0",
  "labels": ["normal", "tumor"]
}
```

## Environment Variables

All settings use the `MEDAI_` prefix.

```powershell
$env:MEDAI_ALLOW_UNTRAINED_FALLBACK="false"
$env:MEDAI_FRONTEND_ORIGINS='["http://localhost:3000"]'
```

By default, `MEDAI_ALLOW_UNTRAINED_FALLBACK=true`, so `/analyze` returns a clear fallback response if a modality model has not been trained yet. Set it to `false` in production.

## Production Notes

- Train and validate each modality model before enabling production inference.
- Keep DICOM handling enabled with `pydicom`.
- Store generated model artifacts in `backend/saved_models`.
- Run behind HTTPS and add authentication before handling real clinical data.
- This system is an AI assistance pipeline, not a standalone medical device.
