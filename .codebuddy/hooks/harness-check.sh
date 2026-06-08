#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0

run_step() {
  local name="$1"
  shift
  echo "[Harness] $name"
  if ! "$@"; then
    echo "[Harness] FAILED: $name" >&2
    FAIL=1
  fi
}

if command -v rg >/dev/null 2>&1; then
  if (cd "$ROOT" && rg '<select\b|<option\b' frontend --glob '*.{ts,tsx}' --glob '!**/node_modules/**' --glob '!**/.next/**') >/tmp/vor-select-check.txt 2>/dev/null; then
    echo "[Harness] FAILED: 前端存在原生 select/option，请改用 frontend/components/dropdown.tsx" >&2
    cat /tmp/vor-select-check.txt >&2
    FAIL=1
  fi
  rm -f /tmp/vor-select-check.txt
fi

if [ -d "$ROOT/frontend/node_modules" ]; then
  run_step "frontend typecheck" bash -lc "cd '$ROOT/frontend' && npm run typecheck"
  run_step "frontend lint" bash -lc "cd '$ROOT/frontend' && npm run lint"
else
  echo "[Harness] SKIP: frontend/node_modules 不存在，跳过前端检查。" >&2
fi

if (cd "$ROOT/backend" && python3 -m ruff --version >/dev/null 2>&1); then
  run_step "backend ruff" bash -lc "cd '$ROOT/backend' && python3 -m ruff check app workers"
else
  echo "[Harness] SKIP: backend ruff 不可用。" >&2
fi

if (cd "$ROOT/ml" && python3 -m ruff --version >/dev/null 2>&1); then
  run_step "ml ruff" bash -lc "cd '$ROOT/ml' && python3 -m ruff check valorant_cv valorant_vlm"
else
  echo "[Harness] SKIP: ml ruff 不可用。" >&2
fi

exit "$FAIL"
