#!/usr/bin/env bash
# ============================================================
# Shirone 博客 · 自建 Umami 统计服务一键脚本（Docker 版）
# ------------------------------------------------------------
# 用法（在仓库根目录或任意位置执行）：
#   bash scripts/deploy-umami.sh            # 启动（首次会提示先准备 .env）
#   bash scripts/deploy-umami.sh up         # 同上
#   bash scripts/deploy-umami.sh test       # 健康检查
#   bash scripts/deploy-umami.sh logs       # 跟踪容器日志
#   bash scripts/deploy-umami.sh ps         # 查看容器状态
#   bash scripts/deploy-umami.sh update     # 拉取新镜像并重建
#   bash scripts/deploy-umami.sh down       # 停止（保留数据卷）
#   bash scripts/deploy-umami.sh secret     # 生成两个随机密钥，供 .env 使用
#
# 配置文件是 docs/umami/.env（从 docs/umami/.env.example 复制）。
# 完整说明见 docs/DEPLOYMENT_UMAMI.md。
#
# ⚠ 不要把 docs/umami/.env 提交到 Git；不要执行 `docker compose down -v`
#   （-v 会删掉数据库卷，访客数据清零）。
# ============================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
UMAMI_DEPLOY_DIR="${UMAMI_DEPLOY_DIR:-${DEPLOY_DIR:-$PROJECT_DIR/docs/umami}}"
COMPOSE_FILE="$UMAMI_DEPLOY_DIR/docker-compose.yml"
ENV_FILE="$UMAMI_DEPLOY_DIR/.env"

log() { printf '\033[1;36m[umami]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[umami]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[umami]\033[0m %s\n' "$*" >&2; exit 1; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    die "未找到 docker compose / docker-compose，请先安装 Docker。"
  fi
}

env_value() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}

require_env_file() {
  [ -f "$ENV_FILE" ] || die "缺少 $ENV_FILE：先执行
  cp $UMAMI_DEPLOY_DIR/.env.example $ENV_FILE && vi $ENV_FILE"
  [ -n "$(env_value POSTGRES_PASSWORD)" ] || die "$ENV_FILE 里 POSTGRES_PASSWORD 为空"
  [ -n "$(env_value APP_SECRET)" ] || die "$ENV_FILE 里 APP_SECRET 为空"
  case "$(env_value POSTGRES_PASSWORD)" in
    change-me*) die "请先修改 $ENV_FILE 里的 POSTGRES_PASSWORD（可用本脚本的 secret 命令生成）" ;;
  esac
  case "$(env_value APP_SECRET)" in
    change-me*) die "请先修改 $ENV_FILE 里的 APP_SECRET（32 位以上随机串）" ;;
  esac
}

port() {
  local value
  value="${UMAMI_PORT:-$(env_value UMAMI_PORT)}"
  echo "${value:-3000}"
}

do_up() {
  require_env_file
  log "启动 Umami（compose 文件：$COMPOSE_FILE）"
  compose up -d
  log "已启动。首次登录后台为 admin / umami，请立刻改密码。"
  log "对外访问前记得用 docs/umami/nginx-umami.conf 配好反向代理与 HTTPS。"
}

do_test() {
  local p
  p="$(port)"
  log "健康检查 http://127.0.0.1:$p/api/heartbeat"
  if curl -fsS --max-time 5 "http://127.0.0.1:$p/api/heartbeat" >/dev/null; then
    log "✅ Umami 正常响应"
  else
    die "❌ 无响应：docker compose ps / logs 查看容器状态"
  fi
}

do_secret() {
  log "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
  log "APP_SECRET=$(openssl rand -hex 32)"
}

command="${1:-up}"
shift || true

case "$command" in
  up) do_up ;;
  down) compose down; log "已停止（数据卷保留）。" ;;
  logs) compose logs -f --tail=200 ;;
  ps) compose ps ;;
  test) do_test ;;
  secret) do_secret ;;
  update) require_env_file; compose pull; compose up -d; log "已更新。" ;;
  *) die "未知命令：$command（可用：up / down / logs / ps / test / update / secret）" ;;
esac
