SHELL := /bin/bash
APP := glossaryapi
IMAGE := $(APP):latest
VENV := .venv
HOST := 0.0.0.0
PORT := 8000
DOCS_PORT := 8001

.PHONY: help install run test docker-build docker-run compose-up compose-down clean proto openapi openapi-serve

help:
	@echo "Common targets:"
	@echo "  make install      - create venv and install deps with uv"
	@echo "  make run          - run gRPC server locally"
	@echo "  make test         - run pytest"
	@echo "  make proto        - compile protobufs"
	@echo "  make openapi      - generate OpenAPI via protoc-gen-openapiv2"
	@echo "  make openapi-serve- serve OpenAPI UI at http://localhost:$(DOCS_PORT)/swagger.html"
	@echo "  make docker-build - build Docker image"
	@echo "  make docker-run   - run Docker container (maps 8000, mounts sqlite)"
	@echo "  make compose-up   - run via docker compose"
	@echo "  make compose-down - stop compose"
	@echo "  make clean        - remove venv and caches"

install: $(VENV)
	. $(VENV)/bin/activate && uv pip install -e . && uv pip install '.[dev]'

$(VENV):
	uv venv

run: proto
	$(VENV)/bin/python -m app.grpc_server --host $(HOST) --port 50051

proto:
	$(VENV)/bin/python scripts/compile_protos.py

openapi: proto
	@which protoc >/dev/null || (echo "protoc not found. Install protobuf compiler." && exit 1)
	GRPC_TOOLS_INCLUDE=$$(python3 -c "from pkg_resources import resource_filename; print(resource_filename('grpc_tools','_proto'))"); \
	PLUGIN=$$(command -v protoc-gen-openapiv2 || echo $$(go env GOPATH 2>/dev/null)/bin/protoc-gen-openapiv2); \
	if [ ! -x "$$PLUGIN" ]; then echo "protoc-gen-openapiv2 not found. Install grpc-gateway plugin." && exit 1; fi; \
	mkdir -p openapi; \
	PATH="$$PATH:$$(go env GOPATH 2>/dev/null)/bin" \
	protoc -I app/protos -I "$$GRPC_TOOLS_INCLUDE" \
	  --plugin=protoc-gen-openapiv2="$$PLUGIN" \
	  --openapiv2_out openapi \
	  --openapiv2_opt=logtostderr=true,allow_merge=true,merge_file_name=api,json_names_for_fields=false \
	  app/protos/terms.proto

openapi-serve:
	cd openapi && python3 -m http.server $(DOCS_PORT)

test:
	$(VENV)/bin/pytest -q



docker-build:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p 50051:50051 -e HOST=$(HOST) -e PORT=50051 -v $(PWD)/glossary.db:/app/glossary.db $(IMAGE)

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down

clean:
	rm -rf $(VENV) .pytest_cache __pycache__ *.pyc
