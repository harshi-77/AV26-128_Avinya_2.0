# Project Structure

```text
Predictive analytics for disease outbreaks/
├── backend/              FastAPI backend, model loading, inference APIs, training scripts
├── dataset/              Local training/testing datasets, ignored for GitHub because it is large
├── docs/                 Presentation and project documentation
├── frontend/             Folder note for GitHub organization
├── github-assets/        Small screenshots or diagrams for README/demo use
├── src/                  React frontend source code
├── index.html            Vite app entry file
├── package.json          Frontend dependencies and scripts
├── vite.config.js        Vite configuration
└── .gitignore            GitHub-safe ignore rules
```

## Why The Frontend Was Not Moved

The React/Vite frontend is already working from the root folder. Moving `src`, `package.json`, or `vite.config.js` into `frontend/` would change how the app runs and could break the current presentation setup.

## GitHub Upload Notes

- `node_modules/`, `dist/`, virtual environments, logs, uploads, and local caches are ignored.
- `dataset/` is ignored because it is several GB and should not be pushed directly to GitHub.
- `backend/saved_models/` is not ignored because the app uses trained model files for inference. If GitHub rejects any model file over 100 MB, use Git LFS or share the model separately.
