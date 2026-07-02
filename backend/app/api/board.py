"""Delivery 看板 API —— 整板快照、稿件/欄位/合約 CRUD、觸發轉稿、通知、發佈連結、即時 SSE。

無 auth(Joey 指示先做功能):actor/author 由前端帶名字,純記名。
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


def _json_default(o: Any):
    return o.isoformat() if isinstance(o, datetime) else str(o)


def _dumps(d: Any) -> str:
    return json.dumps(d, ensure_ascii=False, default=_json_default)


# ──────────────────────────── 請求模型 ────────────────────────────

class CreateTaskReq(BaseModel):
    title: str
    column_id: int | None = None
    type: str | None = None
    description: str = ""
    priority: str = "normal"
    client: str = ""
    item_type: str = ""
    bd_owner: str = ""
    dm_owner: str = ""
    editor: str = ""
    contract_id: int | None = None
    channels: str = ""
    notes: str = ""
    draft_deadline: datetime | None = None
    publish_deadline: datetime | None = None
    due_date: datetime | None = None
    assignee: str = ""
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
    priority: str | None = None
    type: str | None = None
    column_id: int | None = None
    position: float | None = None
    client: str | None = None
    item_type: str | None = None
    bd_owner: str | None = None
    dm_owner: str | None = None
    editor: str | None = None
    contract_id: int | None = None
    channels: str | None = None
    notes: str | None = None
    draft_deadline: datetime | None = None
    publish_deadline: datetime | None = None
    due_date: datetime | None = None
    assignee: str | None = None
    source_url: str | None = None
    source_file: str | None = None
    article_type: str | None = None
    supplier: str | None = None
    header_disclaimer: str | None = None
    footer_disclaimer: str | None = None
    # 細粒度狀態機 + Notion 對齊補欄(G1/G2/G3)
    status: str | None = None
    scheduled_publish_at: datetime | None = None
    line_proof_url: str | None = None
    draft_doc_url: str | None = None
    site_published: bool | None = None
    takedown_date: datetime | None = None
    banner_spec: str | None = None
    placement_slot_id: str | None = None
    exec_sheet_ref: str | None = None
    actor: str = ""


class CommentReq(BaseModel):
    body: str
    author: str = ""


class RunReq(BaseModel):
    actor: str = ""


class UrlsReq(BaseModel):
    urls: dict[str, str]
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


class ContractReq(BaseModel):
    client: str = ""
    name: str = ""
    mode: str = ""
    quota: dict[str, int] = {}
    channels: str = ""
    notes: str = ""
    sheet_ref: str = ""
    start_date: datetime | None = None
    end_date: datetime | None = None


# ──────────────────────────── 稿件 / 板 ────────────────────────────

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


@router.post("/tasks/{task_id}/urls")
async def set_urls(task_id: int, body: UrlsReq) -> dict:
    try:
        return svc.update_published_urls(task_id, body.urls, actor=body.actor)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/tasks/{task_id}/notify-bd")
async def notify_bd(task_id: int, body: RunReq) -> dict:
    try:
        return svc.notify_bd(task_id, actor=body.actor)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


# ──────────────────────────── 欄位 ────────────────────────────

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


# ──────────────────────────── 合約 ────────────────────────────

@router.get("/contracts")
async def list_contracts() -> list[dict]:
    return svc.list_contracts()


@router.post("/contracts")
async def create_contract(body: ContractReq) -> dict:
    return svc.create_contract(body.model_dump())


@router.patch("/contracts/{contract_id}")
async def update_contract(contract_id: int, body: ContractReq) -> dict:
    try:
        return svc.update_contract(contract_id, body.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: int) -> dict:
    svc.delete_contract(contract_id)
    return {"ok": True}


# ──────────────────────────── 每日晨報 / 主動彙報 ────────────────────────────

@router.get("/digest")
async def get_digest() -> dict:
    """AI 主理人晨報:待人動作 / 今日截止 / 逾期 / 今日排程 / Banner 到期 / 合約預警。"""
    from app.services.digest import build_digest, digest_text

    d = build_digest()
    d["text"] = digest_text(d)
    return d


# ──────────────────────────── 即時 SSE ────────────────────────────

@router.get("/stream")
async def stream_board():
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
                    yield {"event": "ping", "data": "{}"}
        finally:
            board_bus.unsubscribe(board_id, q)

    return EventSourceResponse(gen())
