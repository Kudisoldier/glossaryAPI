# Glossary API (gRPC)

gRPC-based glossary service with SQLite storage (SQLModel/SQLAlchemy). The service exposes a `TermsService` with health and CRUD operations over gRPC.

## Features
- CRUD operations on glossary terms via gRPC
- SQLite persistence via SQLModel/SQLAlchemy
- Dockerfile and Docker Compose for containerized deployment

## API
Defined in protobuf at `app/protos/terms.proto` under package `glossary.v1`.
Service: `TermsService` methods
- `Health(HealthCheckRequest) -> HealthCheckResponse`
- `ListTerms(ListTermsRequest) -> ListTermsResponse`
- `GetTerm(GetTermRequest) -> Term`
- `CreateTerm(CreateTermRequest) -> Term`
- `UpdateTerm(UpdateTermRequest) -> Term` (uses optional `StringValue` fields)
- `DeleteTerm(DeleteTermRequest) -> google.protobuf.Empty`

## Quickstart (Makefile)
Ensure you have `uv` installed (Python package manager) and Docker (optional for container runs).

```bash
# 1) Create venv and install dependencies
make install

# 2) Compile protobufs (generates Python stubs under app/protos/)
make proto

# 3) Run the gRPC server locally (0.0.0.0:50051)
make run

# 4) Run tests
make test

# (Optional) Serve generated OpenAPI via Swagger UI
make openapi-serve
# Open http://localhost:8001/swagger.html
```

Why serving matters: opening `file://` HTML directly blocks required JS APIs (e.g., `process`), causing errors. Use `make openapi-serve` to host files over HTTP.

## gRPC docs generation (OpenAPI)
Generate OpenAPI v2 (Swagger) using the official grpc-gateway plugin for protoc:
```bash
brew install protobuf
brew install grpc-gateway  # provides protoc-gen-openapiv2

make openapi
# Output: openapi/api.swagger.json (or api.swagger.yaml)
```

Serve Swagger UI for the generated OpenAPI:
```bash
make openapi-serve
# then open http://localhost:8001/swagger.html
```

Alternative install of the plugin (if you have Go):
```bash
go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2@latest
# Ensure $(go env GOPATH)/bin is in your PATH
```

## Example requests (grpcurl)
```bash
# Health
grpcurl -plaintext localhost:50051 glossary.v1.TermsService/Health

# List terms
grpcurl -plaintext -d '{}' localhost:50051 glossary.v1.TermsService/ListTerms

# Create term
grpcurl -plaintext -d '{"keyword":"API","description":"Application Programming Interface"}' \
  localhost:50051 glossary.v1.TermsService/CreateTerm

# Get by keyword
grpcurl -plaintext -d '{"keyword":"API"}' localhost:50051 glossary.v1.TermsService/GetTerm

# Update term (change keyword and description)
grpcurl -plaintext -d '{"keyword":"API","newKeyword":{"value":"APIv2"},"description":{"value":"Updated"}}' \
  localhost:50051 glossary.v1.TermsService/UpdateTerm

# Delete term
grpcurl -plaintext -d '{"keyword":"APIv2"}' localhost:50051 glossary.v1.TermsService/DeleteTerm
```

## Python client snippet
```python
import grpc
from app.protos import terms_pb2, terms_pb2_grpc

channel = grpc.insecure_channel("localhost:50051")
stub = terms_pb2_grpc.TermsServiceStub(channel)

print(stub.Health(terms_pb2.HealthCheckRequest()))
resp = stub.CreateTerm(terms_pb2.CreateTermRequest(keyword="API", description="Application Programming Interface"))
print(resp)
```

## Notes on grpcurl
The server enables reflection, so you can query without local protos:
```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 glossary.v1.TermsService/Health
```

## Docker
```bash
# Build the image
make docker-build

# Run the container (exposes :50051, mounts local sqlite DB)
make docker-run
# or vanilla Docker
# docker build -t glossaryapi:latest .
# docker run --rm -p 50051:50051 -v $(pwd)/glossary.db:/app/glossary.db glossaryapi:latest
```

## Docker Compose
```bash
# Start in detached mode
make compose-up

# Stop containers
make compose-down
```

## Notes
- The SQLite database file is `glossary.db` (mounted when running in Docker/Docker Compose).
- Protobufs: edit `app/protos/terms.proto` and run `make proto` to regenerate Python stubs.
