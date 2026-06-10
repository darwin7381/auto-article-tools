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


def _job_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "workflow": job.workflow,
        "status": job.status.value if isinstance(job.status, JobStatus) else job.status,
        "input": json.loads(job.input_json),
        "result": json.loads(job.result_json) if job.result_json else None,
        "error": job.error,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }


@router.post("")
async def create_job(body: CreateJobRequest) -> dict:
    if body.workflow not in WORKFLOWS:
        raise HTTPException(404, f"找不到 workflow: {body.workflow}")
    job_id = enqueue_job(body.workflow, body.input)
    return {"id": job_id, "status": "pending"}


@router.get("")
async def list_jobs(limit: int = 50) -> list[dict]:
    with get_session() as s:
        rows = s.exec(select(Job).order_by(Job.id.desc()).limit(limit)).all()  # type: ignore[attr-defined]
        return [_job_dict(j) for j in rows]


@router.get("/{job_id}")
async def get_job(job_id: int) -> dict:
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None:
            raise HTTPException(404, f"找不到 job: {job_id}")
        return _job_dict(job)


@router.get("/{job_id}/stream")
async def stream_job(job_id: int):
    """SSE 即時進度。先重播 DB 已存事件，再接 live 推送；job 已結束則只重播。"""
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None:
            raise HTTPException(404, f"找不到 job: {job_id}")
        past = json.loads(job.events_json or "[]")
        finished = job.status in (JobStatus.done, JobStatus.error)

    q = bus.subscribe(job_id) if not finished else None

    async def gen():
        for ev in past:
            yield {"event": ev["event"], "data": json.dumps(ev["data"], ensure_ascii=False)}
        if finished:
            yield {"event": "end", "data": json.dumps({"status": "replayed"})}
            return
        try:
            while True:
                ev = await asyncio.wait_for(q.get(), timeout=300)
                yield {"event": ev["event"], "data": json.dumps(ev["data"], ensure_ascii=False)}
                if ev["event"] == "end":
                    break
        except asyncio.TimeoutError:
            yield {"event": "timeout", "data": "{}"}
        finally:
            bus.unsubscribe(job_id, q)

    return EventSourceResponse(gen())
