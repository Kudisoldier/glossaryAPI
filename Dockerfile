# syntax=docker/dockerfile:1.7-labs
FROM python:3.11-slim AS base

# Install uv (pip replacement) and build deps
RUN pip install --no-cache-dir uv==0.4.16

WORKDIR /app

# Copy project files
COPY pyproject.toml .
COPY README.md .
COPY app ./app
COPY scripts ./scripts
COPY app/protos ./app/protos

# Install dependencies using uv
RUN uv venv && . .venv/bin/activate && uv pip install -e . && . .venv/bin/activate && python scripts/compile_protos.py

# Default runtime
ENV HOST=0.0.0.0 PORT=50051
EXPOSE 50051

CMD . .venv/bin/activate && python -m app.grpc_server --host $HOST --port $PORT
