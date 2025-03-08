#!/bin/bash

# 配置
APP_DIR="/home/DebatePanel-main"
APP_FILE="src/server.cjs"
PID_FILE="$APP_DIR/server.pid"
LOG_FILE="$APP_DIR/server.log"

# 确保目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 检查服务状态
check_status() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null; then
            return 0  # 运行中
        fi
    fi
    return 1  # 未运行
}

# 启动服务
start() {
    if check_status; then
        echo "Server is already running (PID: $(cat $PID_FILE))"
        return
    fi
    
    echo "Starting server..."
    cd "$APP_DIR" || exit 1
    nohup node "$APP_FILE" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    
    if check_status; then
        echo "Server started successfully (PID: $(cat $PID_FILE))"
    else
        echo "Failed to start server. Check logs: $LOG_FILE"
        exit 1
    fi
}

# 停止服务
stop() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null; then
            echo "Stopping server (PID: $pid)..."
            kill "$pid"
            rm "$PID_FILE"
            echo "Server stopped"
        else
            echo "Server is not running (stale PID file)"
            rm "$PID_FILE"
        fi
    else
        echo "Server is not running"
    fi
}

# 重启服务
restart() {
    stop
    sleep 2
    start
}

# 查看状态
status() {
    if check_status; then
        echo "Server is running (PID: $(cat $PID_FILE))"
        echo "Log file: $LOG_FILE"
    else
        echo "Server is not running"
    fi
}

# 查看日志
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found"
    fi
}

# 命令行参数处理
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac

exit 0
