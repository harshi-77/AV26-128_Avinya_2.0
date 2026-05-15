import sys
import subprocess


MODULES = ["training.train_modality", "training.train_xray", "training.train_mri", "training.train_ctscan"]


if __name__ == "__main__":
    for module in MODULES:
        print(f"\n=== Running {module} ===")
        subprocess.run([sys.executable, "-m", module, *sys.argv[1:]], check=True)
