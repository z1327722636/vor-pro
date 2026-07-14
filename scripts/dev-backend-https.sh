#!/usr/bin/env bash
# Start the FastAPI backend over HTTPS for local WeChat Mini Program dev.
# WeChat Mini Program <image> tags reject http:// sources, so the API
# (and its /frames, /uploads static mounts) must be served over HTTPS.
#
# Usage:
#   bash scripts/dev-backend-https.sh
#
# Then point miniprogram at https://localhost:8443/api (default).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/backend"

if [ ! -f certs/cert.pem ] || [ ! -f certs/key.pem ]; then
  echo "Dev TLS cert not found, generating..."
  bash scripts/generate-dev-cert.sh
fi

PORT="${API_HTTPS_PORT:-8443}"
HOST="${API_HTTPS_HOST:-0.0.0.0}"

exec uvicorn app.main:app \
  --host "$HOST" \
  --port "$PORT" \
  --ssl-keyfile certs/key.pem \
  --ssl-certfile certs/cert.pem \
  --reload
