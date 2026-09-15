#!/bin/bash

set -u

cd "$(dirname "$0")"

HOST="127.0.0.1"
PORT="5181"
URL="http://${HOST}:${PORT}/"
HEALTH_URL="${URL}api/health"

echo "正在启动供应商画像看板..."

# Reuse an already running dashboard instead of failing with "Address already in use".
if curl --silent --fail --max-time 1 "$HEALTH_URL" >/dev/null 2>&1; then
	echo "检测到看板服务已在运行。"
	open "$URL"
	exit 0
fi

python3 backend/server.py &
SERVER_PID=$!

cleanup() {
	kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ready=false
for _ in {1..30}; do
	if curl --silent --fail --max-time 1 "$HEALTH_URL" >/dev/null 2>&1; then
		ready=true
		break
	fi
	if ! kill -0 "$SERVER_PID" 2>/dev/null; then
		break
	fi
	sleep 0.2
done

if [[ "$ready" != true ]]; then
	echo "看板服务启动失败，请检查上方错误信息。"
	exit 1
fi

echo "看板服务已就绪：$URL"
open "$URL"
echo "关闭本窗口即可停止服务。"

wait "$SERVER_PID"