from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.core.registry import WORKFLOWS
from app.worker.runner import run_workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


class RunRequest(BaseModel):
    input: dict[str, Any] = {}


@router.get("")
async def list_workflows() -> list[dict]:
    return [
        {"name": w.name, "description": w.description, "stages": [s.id for s in w.stages]}
        for w in WORKFLOWS.values()
    ]


@router.post("/{name}/run")
async def run(name: str, body: RunRequest):
    """以 SSE 串流跑一條 workflow，逐階段推進度。"""
    if name not in WORKFLOWS:
        raise HTTPException(404, f"找不到 workflow: {name}")

    async def event_source():
        async for ev in run_workflow(name, body.input):
            yield {"event": ev.event, "data": json.dumps(ev.data, ensure_ascii=False)}

    return EventSourceResponse(event_source())
