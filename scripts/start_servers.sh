#!/bin/bash
# Скрипт для запуска REST и gRPC серверов в фоне

set -e

REST_PORT="${REST_PORT:-8000}"
GRPC_PORT="${GRPC_PORT:-50051}"
HOST="${HOST:-0.0.0.0}"

# Создаем PID файлы
REST_PID_FILE=".rest_server.pid"
GRPC_PID_FILE=".grpc_server.pid"

# Функция для остановки серверов
stop_servers() {
    echo "Stopping servers..."
    if [ -f "$REST_PID_FILE" ]; then
        REST_PID=$(cat "$REST_PID_FILE")
        kill $REST_PID 2>/dev/null || true
        rm -f "$REST_PID_FILE"
    fi
    if [ -f "$GRPC_PID_FILE" ]; then
        GRPC_PID=$(cat "$GRPC_PID_FILE")
        kill $GRPC_PID 2>/dev/null || true
        rm -f "$GRPC_PID_FILE"
    fi
    echo "Servers stopped."
}

# Обработка сигналов для корректной остановки
trap stop_servers EXIT INT TERM

# Запускаем REST сервер
echo "Starting REST server on port $REST_PORT..."
uv run uvicorn app.main:app --host "$HOST" --port "$REST_PORT" > .rest_server.log 2>&1 &
REST_PID=$!
echo $REST_PID > "$REST_PID_FILE"
echo "REST server started with PID $REST_PID"

# Ждем немного, чтобы сервер запустился
sleep 2

# Запускаем gRPC сервер
echo "Starting gRPC server on port $GRPC_PORT..."
uv run python -m app.grpc_server --host "$HOST" --port "$GRPC_PORT" > .grpc_server.log 2>&1 &
GRPC_PID=$!
echo $GRPC_PID > "$GRPC_PID_FILE"
echo "gRPC server started with PID $GRPC_PID"

# Ждем, чтобы серверы запустились
sleep 3

# Проверяем, что серверы работают
if ! kill -0 $REST_PID 2>/dev/null; then
    echo "ERROR: REST server failed to start. Check .rest_server.log"
    exit 1
fi

if ! kill -0 $GRPC_PID 2>/dev/null; then
    echo "ERROR: gRPC server failed to start. Check .grpc_server.log"
    exit 1
fi

echo "Both servers are running."
echo "REST API: http://localhost:$REST_PORT"
echo "gRPC API: localhost:$GRPC_PORT"
echo ""
echo "Press Ctrl+C to stop servers."

# Ждем завершения
wait

