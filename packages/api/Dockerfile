FROM python:3.14-slim

# System dependencies required by OpenCV and other ML packages
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv (fast Python package manager)
RUN pip install uv

# Copy dependency files first (for Docker layer caching)
# Note: uv.lock is excluded so torch resolves fresh from the CPU index defined in pyproject.toml
COPY pyproject.toml ./

# Install dependencies using CPU-only torch (keeps image under 4 GB)
RUN uv sync --no-dev

# Copy the rest of the application
COPY . .

EXPOSE 8000

# Use PORT env var if set by the hosting platform (e.g. Railway), otherwise 8000
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
