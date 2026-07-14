#!/usr/bin/env bash
# Generate a self-signed TLS cert for local dev so the WeChat Mini Program
# can load <image> assets over HTTPS. The Mini Program runtime rejects
# plain http:// sources for <image> regardless of the "skip domain check"
# toggle in DevTools. Self-signed certs are accepted by DevTools when the
# "skip domain check" toggle is on.
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1,IP:0.0.0.0"

echo "Generated dev TLS cert:"
echo "  cert: $CERT_DIR/cert.pem"
echo "  key:  $CERT_DIR/key.pem"
