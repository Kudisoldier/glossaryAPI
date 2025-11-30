SHELL := /bin/bash
APP := glossaryapi
IMAGE := $(APP):latest
VENV := .venv
HOST := 0.0.0.0
PORT := 8000
DOCS_PORT := 8001

.PHONY: help install run test docs docs-serve docker-build docker-run compose-up compose-down clean

help:
	@echo "Common targets:"
	@echo "  make install      - create venv and install deps with uv"
	@echo "  make run          - run FastAPI app locally"
	@echo "  make test         - run pytest"
	@echo "  make docs         - generate static OpenAPI docs (json + html)"
	@echo "  make docs-serve   - serve static docs at http://localhost:$(DOCS_PORT)"
	@echo "  make docker-build - build Docker image"
	@echo "  make docker-run   - run Docker container (maps 8000, mounts sqlite)"
	@echo "  make compose-up   - run via docker compose"
	@echo "  make compose-down - stop compose"
	@echo "  make clean        - remove venv and caches"

install:
	uv sync --all-extras

run:
	uv run uvicorn app.main:app --host $(HOST) --port $(PORT) --reload

run-rest:
	uv run uvicorn app.main:app --host $(HOST) --port $(PORT) --reload

run-grpc:
	uv run python -m app.grpc_server --host $(HOST) --port 50051

run-both:
	@echo "Starting REST server on port $(PORT) and gRPC server on port 50051..."
	@uv run uvicorn app.main:app --host $(HOST) --port $(PORT) & \
	uv run python -m app.grpc_server --host $(HOST) --port 50051 & \
	echo "Servers started. Press Ctrl+C to stop."; \
	wait

test:
	uv run pytest -q

docs:
	uv run python scripts/generate_docs.py

docs-serve:
	cd static_docs && python3 -m http.server $(DOCS_PORT)

docker-build:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p $(PORT):8000 -e HOST=$(HOST) -e PORT=8000 -v $(PWD)/glossary.db:/app/glossary.db $(IMAGE)

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down

clean:
	rm -rf .venv .pytest_cache __pycache__ *.pyc .uv
