from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.workflows  # noqa: F401  匯入即註冊所有 workflow
from app.api import agents, health, workflows
from app.models.job import init_db
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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


@app.get("/")
async def root() -> dict:
    return {"service": settings.app_name, "docs": "/docs"}
