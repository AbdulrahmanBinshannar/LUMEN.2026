# ─── Stage 1: install all dependencies ───────────────────────────────────────
FROM python:3.14-slim AS builder

# Build tools needed to compile native packages (e.g. pyroaring)
RUN apt-get update && apt-get install -y \
    gcc build-essential \
    && rm -rf /var/lib/apt/lists/*

# 1. Install CPU-only PyTorch FIRST — before anything else that could pull
#    in 3 GB of NVIDIA/CUDA libraries (ultralytics, etc.)
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# 2. Install all remaining project dependencies.
#    torch/torchvision are already satisfied above so pip will NOT replace them.
RUN pip install --no-cache-dir \
    "google-generativeai>=0.8.3" \
    "fastapi>=0.135.1" \
    "httpx>=0.28.1" \
    "pydantic-settings>=2.13.1" \
    "python-dotenv>=1.2.2" \
    "python-jose>=3.5.0" \
    "supabase>=2.15.0" \
    "uvicorn[standard]>=0.42.0" \
    "python-multipart>=0.0.20" \
    "opencv-python-headless>=4.8.0" \
    "ultralytics>=8.1.0" \
    "supervision>=0.20.0" \
    "scikit-learn>=1.4.0" \
    "joblib>=1.3.0" \
    "lightgbm>=4.0.0" \
    "pandas>=2.1.0" \
    "numpy>=1.26.0"

# ─── Stage 2: clean runtime image (no build tools, much smaller) ─────────────
FROM python:3.14-slim AS runtime

# Only the shared libraries required at runtime by OpenCV and others
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages and executables from the builder stage
COPY --from=builder /usr/local/lib /usr/local/lib
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY . .

EXPOSE 8000

# Use PORT env var if set by Railway, otherwise default to 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
