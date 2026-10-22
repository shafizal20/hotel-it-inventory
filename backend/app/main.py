from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.core.config import settings
from app.db import database
from app.routers import auth, dashboard, general, inventory, reports

prod = settings.app_env == "production"
app = FastAPI(title="Hotel IT Inventory", docs_url=None if prod else "/docs", redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, general.router, inventory.deco, inventory.ruijie, inventory.writeoff, dashboard.router, reports.router):
    app.include_router(r, prefix="/api/v1")

@app.get("/health")
def health():
    try:
        with database.engine.connect() as c:
            c.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        return JSONResponse({"status": "database unavailable"}, status_code=503)

# Production: serve the built React app (frontend/dist) from the same origin.
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith(("api/", "health")):
            raise HTTPException(404)
        f = (DIST / path).resolve()
        return FileResponse(f if path and f.is_file() and DIST.resolve() in f.parents else DIST / "index.html")
