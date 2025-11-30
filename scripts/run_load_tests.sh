#!/bin/bash
# Скрипт для запуска нагрузочного тестирования

set -e

REST_HOST="${REST_HOST:-http://localhost:8000}"
GRPC_HOST="${GRPC_HOST:-localhost:50051}"
SCENARIO="${1:-light}"

# Используем uv для запуска команд
UV_CMD="uv run"

case "$SCENARIO" in
    light)
        echo "Running light load test (sanity check)..."
        echo "REST API test:"
        $UV_CMD locust -f locustfiles/rest_user.py --host "$REST_HOST" \
            --users 10 --spawn-rate 2 --run-time 2m --headless \
            --html reports/rest_light.html --csv reports/rest_light
        
        echo "gRPC API test:"
        $UV_CMD locust -f locustfiles/grpc_user.py --host "$GRPC_HOST" \
            --users 10 --spawn-rate 2 --run-time 2m --headless \
            --html reports/grpc_light.html --csv reports/grpc_light
        ;;
    
    normal)
        echo "Running normal load test (realistic usage)..."
        echo "REST API test:"
        $UV_CMD locust -f locustfiles/rest_user.py --host "$REST_HOST" \
            --users 50 --spawn-rate 5 --run-time 5m --headless \
            --html reports/rest_normal.html --csv reports/rest_normal
        
        echo "gRPC API test:"
        $UV_CMD locust -f locustfiles/grpc_user.py --host "$GRPC_HOST" \
            --users 50 --spawn-rate 5 --run-time 5m --headless \
            --html reports/grpc_normal.html --csv reports/grpc_normal
        ;;
    
    stress)
        echo "Running stress test (peak performance)..."
        echo "REST API test:"
        $UV_CMD locust -f locustfiles/rest_user.py --host "$REST_HOST" \
            --users 200 --spawn-rate 10 --run-time 10m --headless \
            --html reports/rest_stress.html --csv reports/rest_stress
        
        echo "gRPC API test:"
        $UV_CMD locust -f locustfiles/grpc_user.py --host "$GRPC_HOST" \
            --users 200 --spawn-rate 10 --run-time 10m --headless \
            --html reports/grpc_stress.html --csv reports/grpc_stress
        ;;
    
    stability)
        echo "Running stability test (long duration)..."
        echo "REST API test:"
        $UV_CMD locust -f locustfiles/rest_user.py --host "$REST_HOST" \
            --users 100 --spawn-rate 5 --run-time 30m --headless \
            --html reports/rest_stability.html --csv reports/rest_stability
        
        echo "gRPC API test:"
        $UV_CMD locust -f locustfiles/grpc_user.py --host "$GRPC_HOST" \
            --users 100 --spawn-rate 5 --run-time 30m --headless \
            --html reports/grpc_stability.html --csv reports/grpc_stability
        ;;
    
    *)
        echo "Unknown scenario: $SCENARIO"
        echo "Available scenarios: light, normal, stress, stability"
        exit 1
        ;;
esac

echo "Load tests completed. Reports saved in reports/ directory."

