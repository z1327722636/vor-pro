FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend:/app/ml

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml /app/backend/pyproject.toml
COPY ml/pyproject.toml /app/ml/pyproject.toml
RUN pip install --no-cache-dir /app/backend /app/ml

COPY backend /app/backend
COPY ml /app/ml

CMD ["celery", "-A", "workers.celery_app:celery_app", "worker", "--loglevel=INFO", "--workdir", "/app/backend"]
