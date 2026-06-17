from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.workflows  # noqa: F401  匯入即註冊所有 workflow
from app.api import (
    agents,
    files,
    health,
    jobs,
    publish,
    site_config,
    uploads,
    versions,
    workflows,
)
from app.models.job import init_db
from app.settings import settings
from app.worker.jobrunner import start_worker

_FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await start_worker()  # durable job worker（asyncio queue + semaphore）
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 內部工具 + tunnel 隨機 origin；要鎖再改白名單
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(workflows.router)
app.include_router(jobs.router)
app.include_router(uploads.router)
app.include_router(files.router)
app.include_router(publish.router)
app.include_router(site_config.router)
app.include_router(versions.router)


# 同源托管前端 SPA（build 後的 dist）：API 路由先註冊、優先；其餘交給靜態檔。
# 這樣前端用相對路徑打 API，免 CORS、只需一條 tunnel。
class _SpaStatic(StaticFiles):
    """index.html 一律 no-cache（否則瀏覽器啟發式快取 → 使用者卡在舊 bundle）；
    hashed assets 永久快取。"""

    async def get_response(self, path: str, scope):  # type: ignore[override]
        resp = await super().get_response(path, scope)
        if path.startswith("assets/"):
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            resp.headers["Cache-Control"] = "no-cache"
        return resp


if _FRONTEND_DIST.exists():
    app.mount("/", _SpaStatic(directory=str(_FRONTEND_DIST), html=True), name="spa")
else:
    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "note": "frontend dist 未 build"}
