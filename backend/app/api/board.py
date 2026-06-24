"""部門看板 API —— 整板快照、卡片/欄位 CRUD、觸發 pipeline、即時 SSE。

無 auth(Joey 指示先做功能):actor/author 由前端帶名字,純記名,不驗證。
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.core.eventbus import board_bus
from app.services import board as svc

router = APIRouter(prefix="/board", tags=["board"])


def _default_to_json(o: Any):
    if isinstance(o, datetime):
        return o.isoformat()
    return str(o)


def _dumps(d: Any) -> str:
    return json.dumps(d, ensure_ascii=False, default=_default_to_json)


# ──────────────────────────── 請求模型 ────────────────────────────

class CreateTaskReq(BaseModel):
    title: str
    type: str = "general"
    column_id: int | None = None
    description: str = ""
    assignee: str = ""
    priority: str = "normal"
    due_date: datetime | None = None
    source_url: str = ""
    source_file: str = ""
    article_type: str = ""
    supplier: str = ""
    header_disclaimer: str = ""
    footer_disclaimer: str = ""
    actor: str = ""


class UpdateTaskReq(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    type: str | None = None
    column_id: int | None = None
    position: float | None = None
    source_url: str | None = None
    source_file: str | None = None
    article_type: str | None = None
    supplier: str | None = None
    header_disclaimer: str | None = None
    footer_disclaimer: str | None = None
    actor: str = ""


class CommentReq(BaseModel):
    body: str
    author: str = ""


class RunReq(BaseModel):
    actor: str = ""


class CreateColumnReq(BaseModel):
    name: str
    kind: str = "custom"
    wip_limit: int | None = None


class UpdateColumnReq(BaseModel):
    name: str | None = None
    position: float | None = None
    wip_limit: int | None = None
    kind: str | None = None


# ──────────────────────────── 路由 ────────────────────────────

@router.get("")
async def get_board() -> dict:
    return svc.board_snapshot(svc.get_default_board_id())


@router.post("/tasks")
async def create_task(body: CreateTaskReq) -> dict:
    data = body.model_dump()
    actor = data.pop("actor", "")
    return svc.create_task(svc.get_default_board_id(), data, actor=actor)


@router.get("/tasks/{task_id}")
async def get_task(task_id: int) -> dict:
    try:
        return svc.task_detail(task_id)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.patch("/tasks/{task_id}")
async def update_task(task_id: int, body: UpdateTaskReq) -> dict:
    patch = body.model_dump(exclude_unset=True)
    actor = patch.pop("actor", "")
    try:
        return svc.update_task(task_id, patch, actor=actor)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int) -> dict:
    svc.delete_task(task_id)
    return {"ok": True}


@router.post("/tasks/{task_id}/run")
async def run_task(task_id: int, body: RunReq) -> dict:
    try:
        return svc.run_task_pipeline(task_id, actor=body.actor)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.post("/tasks/{task_id}/comments")
async def add_comment(task_id: int, body: CommentReq) -> dict:
    try:
        return svc.add_comment(task_id, body.body, author=body.author)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/columns")
async def create_column(body: CreateColumnReq) -> dict:
    return svc.create_column(svc.get_default_board_id(), body.name, kind=body.kind, wip_limit=body.wip_limit)


@router.patch("/columns/{column_id}")
async def update_column(column_id: int, body: UpdateColumnReq) -> dict:
    try:
        return svc.update_column(column_id, body.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.delete("/columns/{column_id}")
async def delete_column(column_id: int) -> dict:
    svc.delete_column(column_id)
    return {"ok": True}


@router.get("/stream")
async def stream_board():
    """看板即時 SSE:卡建立/移動/更新/刪除、留言、欄位變更。多人同看即時同步。

    快照是真相來源:前端先 GET /board 取整板,再接這條串流套用增量事件。
    """
    board_id = svc.get_default_board_id()
    q = board_bus.subscribe(board_id)

    async def gen():
        try:
            yield {"event": "ready", "data": "{}"}
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=25)
                    yield {"event": ev["event"], "data": _dumps(ev["data"])}
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}  # 心跳,撐住反代連線
        finally:
            board_bus.unsubscribe(board_id, q)

    return EventSourceResponse(gen())
