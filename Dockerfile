FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend:/app/ml

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN pip install --no-cache-dir /app/backend

COPY backend /app/backend
COPY ml /app/ml
COPY frontend/public/assets/valorant/maps /app/frontend/public/assets/valorant/maps

CMD ["sh", "-c", "cd /app/backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
