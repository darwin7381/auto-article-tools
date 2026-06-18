"""Job API —— durable 執行：建立 job（排入 worker）、查狀態/結果、SSE 即時進度。

與 POST /workflows/{name}/run（直跑 SSE，無持久化）不同，這裡每次執行都是 DB 裡一筆 Job，
可併發、可查歷史、SSE 可斷線重播。前端 console 走這條。
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sse_starlette.sse import EventSourceResponse

from app.core.eventbus import bus
from app.core.registry import WORKFLOWS
from app.models import Job, JobStatus, get_session
from app.worker.jobrunner import enqueue_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


class CreateJobRequest(BaseModel):
    workflow: str
    input: dict[str, Any] = {}
    from_stage: str | None = None  # 從某階段重跑；input 即該階段輸入態（可被使用者編輯過）


def _stage_outputs(job: Job) -> list[dict]:
    """從 events 萃取每階段的輸出與耗時，給前端逐階段展開檢視。"""
    out = []
    for ev in json.loads(job.events_json or "[]"):
        d = ev.get("data", {})
        if ev.get("event") == "stage" and d.get("status") == "done":
            out.append({"id": d.get("id"), "output": d.get("output"),
                        "elapsed_ms": d.get("elapsed_ms"), "tokens": d.get("tokens")})
    return out


def _job_dict(job: Job, with_stages: bool = False, slim: bool = False) -> dict:
    """slim=True：不含 result/stages 的輕量摘要。

    列表/輪詢 payload 控制是手機+tunnel 體感的關鍵——完整 result（整篇稿+HTML）
    一筆可達數百 KB，每 1.5s 輪詢或一次列 50 筆會把行動網路塞死。
    """
    d = {
        "id": job.id,
        "workflow": job.workflow,
        "status": job.status.value if isinstance(job.status, JobStatus) else job.status,
        "input": json.loads(job.input_json),
        "start_stage": job.start_stage,
        "error": job.error,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }
    if not slim:
        d["result"] = json.loads(job.result_json) if job.result_json else None
    if with_stages:
        d["stages"] = _stage_outputs(job)
    # 輪詢用的階段進度摘要（極小）：已完成階段 id 列表
    if slim:
        d["done_stages"] = [s["id"] for s in _stage_outputs(job)]
    return d


@router.post("")
async def create_job(body: CreateJobRequest) -> dict:
    if body.workflow not in WORKFLOWS:
        raise HTTPException(404, f"找不到 workflow: {body.workflow}")
    job_id = enqueue_job(body.workflow, body.input, start_stage=body.from_stage)
    return {"id": job_id, "status": "pending"}


@router.get("")
async def list_jobs(limit: int = 50) -> list[dict]:
    """列表一律輕量（不含 result）。"""
    with get_session() as s:
        rows = s.exec(select(Job).order_by(Job.id.desc()).limit(limit)).all()  # type: ignore[attr-defined]
        return [_job_dict(j, slim=True) for j in rows]


@router.get("/{job_id}")
async def get_job(job_id: int, full: bool = True) -> dict:
    """full=false：輕量狀態（輪詢用，含 done_stages 摘要）；full=true：完整含逐階段輸出。"""
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None:
            raise HTTPException(404, f"找不到 job: {job_id}")
        return _job_dict(job, with_stages=full, slim=not full)


@router.get("/{job_id}/stream")
async def stream_job(job_id: int):
    """SSE 即時進度。先訂閱再重播已存事件（seq 去重堵訂閱競態）；job 已結束則只重播。"""
    q = bus.subscribe(job_id)  # 先訂閱：重播與 live 之間不漏事件
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None:
            bus.unsubscribe(job_id, q)
            raise HTTPException(404, f"找不到 job: {job_id}")
        past = json.loads(job.events_json or "[]")
        finished = job.status in (JobStatus.done, JobStatus.error)
    last_seq = max((e.get("seq", -1) for e in past), default=-1)

    async def gen():
        try:
            for ev in past:
                yield {"event": ev["event"], "data": json.dumps(ev["data"], ensure_ascii=False)}
            if finished:
                yield {"event": "end", "data": json.dumps({"status": "replayed"})}
                return
            while True:
                ev = await asyncio.wait_for(q.get(), timeout=300)
                if ev.get("seq", -1) <= last_seq:
                    continue  # 重播已涵蓋，去重
                yield {"event": ev["event"], "data": json.dumps(ev["data"], ensure_ascii=False)}
                if ev["event"] == "end":
                    break
        except asyncio.TimeoutError:
            yield {"event": "timeout", "data": "{}"}
        finally:
            bus.unsubscribe(job_id, q)

    return EventSourceResponse(gen())
