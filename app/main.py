from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routers import terms, sources, relations, graph
from .db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
	init_db()
	yield


app = FastAPI(title="Glossary API", version="0.2.0", lifespan=lifespan)

# Register API routers first
app.include_router(terms.router, prefix="/terms", tags=["terms"])
app.include_router(sources.router, prefix="/sources", tags=["sources"])
app.include_router(relations.router, prefix="/relations", tags=["relations"])
app.include_router(graph.router, prefix="/graph", tags=["graph"])

# Serve static files for frontend (must be after routers)
frontend_dir = Path(__file__).parent.parent / "frontend" / "dist"

if frontend_dir.exists() and (frontend_dir / "index.html").exists():
	app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")
	
	@app.get("/")
	async def read_root():
		return FileResponse(str(frontend_dir / "index.html"))


@app.get("/health")
def health_check():
	return {"status": "ok"}
