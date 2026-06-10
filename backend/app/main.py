from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.workflows  # noqa: F401  匯入即註冊所有 workflow
from app.api import agents, files, health, jobs, publish, site_config, uploads, workflows
from app.models.job import init_db
from app.settings import settings
from app.worker.jobrunner import start_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await start_worker()  # durable job worker（asyncio queue + semaphore）
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
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


@app.get("/")
async def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs"}
