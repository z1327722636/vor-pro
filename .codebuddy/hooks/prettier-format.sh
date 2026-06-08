#!/usr/bin/env bash
set -euo pipefail

TMP_FILE="$(mktemp)"
cat > "$TMP_FILE"

FILE_PATH="$(python3 - "$TMP_FILE" <<'PY' 2>/dev/null || true
import json
import sys

try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    tool_input = data.get("tool_input", {}) or {}
    print(
        tool_input.get("file_path")
        or tool_input.get("filePath")
        or tool_input.get("target_file")
        or ""
    )
except Exception:
    print("")
PY
)"
rm -f "$TMP_FILE"

[ -z "$FILE_PATH" ] && exit 0

ROOT="$(pwd)"
ABS_PATH="$FILE_PATH"
if [[ "$ABS_PATH" != /* ]]; then
  ABS_PATH="$ROOT/$ABS_PATH"
fi

FRONTEND_DIR="$ROOT/frontend"
case "$ABS_PATH" in
  "$FRONTEND_DIR"/*) ;;
  *) exit 0 ;;
esac

case "$ABS_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css) ;;
  *) exit 0 ;;
esac

[ -f "$ABS_PATH" ] || exit 0

REL_PATH="${ABS_PATH#$FRONTEND_DIR/}"
cd "$FRONTEND_DIR"

if [ -x "node_modules/.bin/prettier" ]; then
  node_modules/.bin/prettier --write "$REL_PATH" >/dev/null
elif command -v prettier >/dev/null 2>&1; then
  prettier --write "$REL_PATH" >/dev/null
fi
