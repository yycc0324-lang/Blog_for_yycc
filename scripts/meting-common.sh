#!/usr/bin/env bash
# ============================================================
# Shirone 博客 · Meting 脚本公共库
# ------------------------------------------------------------
# 被 deploy-meting.sh / update-meting-cookie.sh source。
# 作用：自动识别 Meting 服务的「部署目录」，让日常维护命令
#       不需要再手写 DEPLOY_DIR=... 前缀。
#
# 识别顺序（DEPLOY_DIR 显式传入时直接采用）：
#   ① $HOME/shirone-meting 或 /www/wwwroot/shirone-meting 已存在且像部署目录
#   ② 正在运行的容器反推（读容器挂载：qq-cookie.txt / meting-api/cache 的宿主机路径，
#      并用该容器的已发布端口作为 METING_PORT）
#      —— 这样「与他人共用同一容器」时也能认出来
#   ③ 默认：服务器路径 /www/wwwroot/shirone-meting（不可写则回退 $HOME/shirone-meting）
#
# 识别成功后导出：
#   DEPLOY_DIR            部署目录（调用方使用）
#   MT_DETECTED_PORT      从运行中的容器读到的宿主机端口（未识别到则为空）
#
# 说明：本库只做只读探测，不会创建/修改任何文件。
# ============================================================

# 默认目录（可被环境变量覆盖）
: "${METING_LOCAL_DIR_DEFAULT:=$HOME/shirone-meting}"
: "${METING_SERVER_DIR_DEFAULT:=/www/wwwroot/shirone-meting}"

mt_info() { echo "ⓘ $*"; }

# 从正在运行的容器挂载反推部署目录与端口；成功则依次输出「目录」和「端口」两行
mt_detect_from_containers() {
	command -v docker >/dev/null 2>&1 || return 1
	docker info >/dev/null 2>&1 || return 1

	local name dest src found="" port=""
	for name in $(docker ps --format '{{.Names}}' 2>/dev/null || true); do
		# 这里用 here-doc 而非管道，保证 while 内的变量在函数作用域内生效
		while IFS='|' read -r dest src; do
			[ -n "$dest" ] || continue
			case "$dest" in
				*/qq-cookie.txt)
					found="$(dirname "$src")"
					break
					;;
				*/var/www/html/cache)
					found="$(dirname "$(dirname "$src")")"
					break
					;;
			esac
		done <<EOF
$(docker inspect "$name" --format '{{range .Mounts}}{{.Destination}}|{{.Source}}{{"\n"}}{{end}}' 2>/dev/null)
EOF
		if [ -n "$found" ]; then
			# 读该容器映射到 80 端口的宿主机端口（形如 127.0.0.1:8899）
			port="$(docker port "$name" 80/tcp 2>/dev/null | head -1 | sed 's/.*://' || true)"
			printf '%s\n%s\n' "$found" "$port"
			return 0
		fi
	done
	return 1
}

# 判断某个目录是否像 Meting 部署目录
mt_looks_like_deploy_dir() {
	[ -n "${1:-}" ] || return 1
	[ -f "$1/qq-cookie.txt" ] || [ -f "$1/docker-compose.yml" ] || [ -d "$1/meting-api" ]
}

# 解析并设置 DEPLOY_DIR（全局变量，供调用方使用）
mt_resolve_deploy_dir() {
	if [ -n "${DEPLOY_DIR:-}" ]; then
		mt_info "使用显式指定的 DEPLOY_DIR=$DEPLOY_DIR"
		return 0
	fi

	local dir detected detected_dir detected_port
	MT_DETECTED_PORT=""

	# ① 已存在的 Shirone 专属目录（自带容器优先于共用容器）
	for dir in "$METING_LOCAL_DIR_DEFAULT" "$METING_SERVER_DIR_DEFAULT"; do
		if mt_looks_like_deploy_dir "$dir"; then
			DEPLOY_DIR="$dir"
			mt_info "自动识别到已有部署目录：$DEPLOY_DIR"
			return 0
		fi
	done

	# ② 从正在运行的容器反推（含与其它站点共用的容器）
	if detected="$(mt_detect_from_containers)" && [ -n "$detected" ]; then
		detected_dir="$(printf '%s' "$detected" | sed -n 1p)"
		detected_port="$(printf '%s' "$detected" | sed -n 2p)"
		if [ -n "$detected_dir" ]; then
			DEPLOY_DIR="$detected_dir"
			MT_DETECTED_PORT="$detected_port"
			mt_info "根据运行中的 Meting 容器自动识别：DEPLOY_DIR=$DEPLOY_DIR${MT_DETECTED_PORT:+（端口 ${MT_DETECTED_PORT}）}"
			case "$(basename "$DEPLOY_DIR")" in
				*meting-local)
					mt_info "  该容器与其它站点共用，写入后两边同时生效（无需重启容器）"
					;;
			esac
			return 0
		fi
	fi

	# ③ 默认路径：服务器可写用服务器路径，否则本地目录
	if [ -d "$METING_SERVER_DIR_DEFAULT" ] ||
		mkdir -p "$METING_SERVER_DIR_DEFAULT" 2>/dev/null; then
		DEPLOY_DIR="$METING_SERVER_DIR_DEFAULT"
	else
		DEPLOY_DIR="$METING_LOCAL_DIR_DEFAULT"
		mkdir -p "$DEPLOY_DIR" 2>/dev/null || true
	fi
	mt_info "使用默认部署目录：$DEPLOY_DIR"
	return 0
}
