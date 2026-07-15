FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend /app/backend
COPY frontend/public/assets/valorant/maps /app/frontend/public/assets/valorant/maps

RUN pip install --no-cache-dir /app/backend

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
