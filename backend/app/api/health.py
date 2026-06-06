from __future__ import annotations

from fastapi import APIRouter

from app.core.registry import WORKFLOWS

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "workflows": list(WORKFLOWS.keys())}
