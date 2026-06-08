#!/usr/bin/env bash
set -euo pipefail

TMP_FILE="$(mktemp)"
cat > "$TMP_FILE"

COMMAND_TEXT="$(python3 - "$TMP_FILE" <<'PY' 2>/dev/null || true
import json
import sys

try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    tool_input = data.get("tool_input", {}) or {}
    print(tool_input.get("command") or tool_input.get("cmd") or "")
except Exception:
    print("")
PY
)"
rm -f "$TMP_FILE"

[ -z "$COMMAND_TEXT" ] && exit 0

if echo "$COMMAND_TEXT" | grep -Eq '(^|[;&|[:space:]])rm[[:space:]]+-rf[[:space:]]+(/|~|\$HOME|\*)'; then
  echo "[Harness] 拦截危险 rm -rf 命令。" >&2
  exit 2
fi

if echo "$COMMAND_TEXT" | grep -Eq '(^|[;&|[:space:]])(cat|less|more|tail|head)[[:space:]]+([^;&|[:space:]]*/)?\.env([[:space:]]|$)'; then
  echo "[Harness] 拦截直接输出 .env，避免密钥泄露。需要示例请读取 .env.example。" >&2
  exit 2
fi

if echo "$COMMAND_TEXT" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)'; then
  echo "[Harness] git commit 前执行项目检查..." >&2
  bash .codebuddy/hooks/harness-check.sh >&2
fi
