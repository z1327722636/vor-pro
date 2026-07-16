#!/usr/bin/env bash
set -euo pipefail

# scripts/dev.sh — 一键启动本地开发环境
# 启动: bash scripts/dev.sh
# 停止: Ctrl+C 全部退出（后端、前端、MinIO）

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ── 颜色 ──
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; N='\033[0m'
log()  { echo -e "${G}[dev]${N} $*"; }
info() { echo -e "${C}[dev]${N} $*"; }
warn() { echo -e "${Y}[dev]${N} $*"; }
err()  { echo -e "${R}[dev]${N} $*" >&2; }

# ── 子进程 PID ──
PIDS=()
cleanup() {
  set +e
  echo ""
  log "正在停止所有服务..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null
  done
  sleep 1
  for pid in "${PIDS[@]:-}"; do
    kill -9 "$pid" 2>/dev/null
  done
  log "已全部停止。"
}
trap cleanup INT TERM EXIT

# ── 1. PostgreSQL ──
info "检查 PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  log "启动 PostgreSQL (brew services)..."
  brew services start postgresql@14 >/dev/null 2>&1 || brew services start postgresql >/dev/null 2>&1
  for _ in $(seq 1 10); do pg_isready -q && break; sleep 1; done
fi
pg_isready -q || { err "PostgreSQL 无法启动"; exit 1; }
# 确保 vor 用户密码 + vor 数据库
psql -d postgres -c "ALTER USER vor WITH PASSWORD 'vor_password';" >/dev/null 2>&1 || true
psql -d postgres -c "CREATE DATABASE vor OWNER vor;" >/dev/null 2>&1 || true
# 授予 vor 用户对 vor 库所有表的权限（兼容之前用 superuser 建表的情况）
psql -d vor -c "GRANT ALL ON SCHEMA public TO vor; \
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vor; \
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vor; \
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vor; \
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vor;" >/dev/null 2>&1 || true
log "PostgreSQL: OK"

# ── 2. Redis ──
info "检查 Redis..."
if ! redis-cli ping >/dev/null 2>&1; then
  log "启动 Redis (brew services)..."
  brew services start redis >/dev/null 2>&1
  for _ in $(seq 1 5); do redis-cli ping >/dev/null 2>&1 && break; sleep 1; done
fi
redis-cli ping >/dev/null 2>&1 || { err "Redis 无法启动"; exit 1; }
log "Redis: OK"

# ── 3. MinIO ──
info "检查 MinIO..."
MINIO_DATA_DIR="$ROOT_DIR/storage/minio-data"
mkdir -p "$MINIO_DATA_DIR"
export MINIO_ROOT_USER=vor_minio
export MINIO_ROOT_PASSWORD=vor_minio_password
if ! lsof -iTCP:9000 -sTCP:LISTEN >/dev/null 2>&1; then
  log "启动 MinIO..."
  minio server "$MINIO_DATA_DIR" --console-address ":9001" >"$ROOT_DIR/storage/minio.log" 2>&1 &
  PIDS+=("$!")
  for _ in $(seq 1 15); do
    curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1 && break
    sleep 1
  done
fi
curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1 || { err "MinIO 无法启动，查看 storage/minio.log"; exit 1; }
log "MinIO: OK"

# ── 4. 后端 ──
info "启动后端..."
# 覆盖 .env 中的 Docker 内网地址，用本地连接
export DATABASE_URL="postgresql+asyncpg://vor:vor_password@localhost:5432/vor"
cd "$ROOT_DIR/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
log "运行数据库迁移 (alembic upgrade head)..."
alembic upgrade head 2>&1 | tail -5
log "启动 uvicorn (port 8000, reload)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
PIDS+=("$!")
cd "$ROOT_DIR"
for _ in $(seq 1 20); do
  curl -sf http://localhost:8000/healthz >/dev/null 2>&1 && break
  sleep 1
done
curl -sf http://localhost:8000/healthz >/dev/null 2>&1 || warn "后端未就绪，可能还在启动中"

# ── 5. 前端 ──
info "启动前端..."
cd "$ROOT_DIR/frontend"
npm run dev &
PIDS+=("$!")
cd "$ROOT_DIR"
for _ in $(seq 1 25); do
  curl -sf http://localhost:2367 >/dev/null 2>&1 && break
  sleep 1
done

echo ""
echo -e "${G}════════════════════════════════════════════════${N}"
echo -e "${G}  全部服务已启动${N}"
echo -e "${G}  前端:     http://localhost:2367${N}"
echo -e "${G}  后端:     http://localhost:8000${N}"
echo -e "${G}  API 文档: http://localhost:8000/docs${N}"
echo -e "${G}  MinIO:    http://localhost:9001${N}"
echo -e "${Y}  Ctrl+C 停止全部${N}"
echo -e "${G}════════════════════════════════════════════════${N}"
echo ""

# 阻塞等待子进程，Ctrl+C 触发 cleanup
wait
