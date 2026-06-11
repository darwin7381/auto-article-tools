"""Durable job runner —— DB-backed queue + in-process asyncio worker pool。

- job 狀態存 DB（pending→running→done/error），durable、可查歷史
- asyncio.Semaphore 控併發上限（settings.max_concurrent_jobs）
- 進度事件即時推到 eventbus（SSE），同時 append 進 Job.events_json（斷線可重播）
- 啟動時把上次崩潰殘留的 running 改回 pending 重排（crash recovery）

CLI 仍直接用 runner.run_workflow（不進 job 系統）；API 走這裡的 job 系統。
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from sqlmodel import select

from app.core.eventbus import bus
from app.models import Job, JobStatus, get_session
from app.settings import settings
from app.worker.runner import run_workflow

# queue/loop 在 start_worker 內綁到「實際運行的 app loop」（避免 import 時綁錯 loop）。
_queue: asyncio.Queue[int] | None = None
_loop: asyncio.AbstractEventLoop | None = None
_sem: asyncio.Semaphore | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _submit(job_id: int) -> None:
    """跨執行緒安全地把 job_id 排入 app loop 的佇列。"""
    if _loop is not None and _queue is not None:
        _loop.call_soon_threadsafe(_queue.put_nowait, job_id)


def enqueue_job(workflow: str, input_data: dict, start_stage: str | None = None) -> int:
    """建立一筆 pending job 並排入佇列，回傳 job_id。start_stage：從某階段重跑。"""
    with get_session() as s:
        job = Job(
            workflow=workflow,
            input_json=json.dumps(input_data, ensure_ascii=False),
            start_stage=start_stage,
        )
        s.add(job)
        s.commit()
        s.refresh(job)
        job_id = job.id
    _submit(job_id)
    return job_id


async def _run_job(job_id: int) -> None:
    assert _sem is not None
    async with _sem:
        with get_session() as s:
            job = s.get(Job, job_id)
            if job is None or job.status not in (JobStatus.pending, JobStatus.running):
                return
            workflow = job.workflow
            input_data = json.loads(job.input_json)
            start_stage = job.start_stage
            job.status = JobStatus.running
            job.updated_at = _now()
            s.add(job)
            s.commit()
        events: list[dict] = []
        seq = 0
        result = None
        error = None

        def _persist_events() -> None:
            """事件逐筆即時入庫 → 中途加入/刷新/輪詢都看得到進度（不是跑完才有）。"""
            with get_session() as s2:
                j2 = s2.get(Job, job_id)
                if j2 is not None:
                    j2.events_json = json.dumps(events, ensure_ascii=False)
                    j2.updated_at = _now()
                    s2.add(j2)
                    s2.commit()

        def _emit(event: str, data: dict, persist: bool = True) -> None:
            nonlocal seq
            item = {"seq": seq, "event": event, "data": data}
            seq += 1
            if persist:
                events.append(item)
                _persist_events()
            bus.publish(job_id, item)

        _emit("status", {"status": "running"}, persist=False)
        try:
            async for ev in run_workflow(workflow, input_data, start_stage=start_stage):
                _emit(ev.event, ev.data)
                if ev.event == "done":
                    result = ev.data.get("result")
                elif ev.event == "error":
                    error = ev.data.get("message")
        except Exception as exc:  # noqa: BLE001
            error = str(exc)
            _emit("error", {"message": error})

        with get_session() as s:
            job = s.get(Job, job_id)
            if job is not None:
                job.status = JobStatus.error if error else JobStatus.done
                job.result_json = (
                    json.dumps(result, ensure_ascii=False) if result is not None else None
                )
                job.error = error
                job.events_json = json.dumps(events, ensure_ascii=False)
                job.updated_at = _now()
                s.add(job)
                s.commit()
        _emit("end", {"status": "error" if error else "done"}, persist=False)


async def _dispatcher() -> None:
    assert _queue is not None
    while True:
        job_id = await _queue.get()
        asyncio.create_task(_run_job(job_id))


async def start_worker() -> None:
    """在 FastAPI lifespan 啟動：綁定 loop/queue、建 semaphore、復原殘留 job、起 dispatcher。

    每次以「當前運行的 loop」重綁（正式環境 lifespan 只跑一次；測試多個 TestClient 各有自己的
    loop，需各自啟動 worker）。
    """
    global _sem, _queue, _loop
    running = asyncio.get_running_loop()
    if _loop is running and _queue is not None:
        return  # 已在這個 loop 上啟動過
    _loop = running
    _queue = asyncio.Queue()
    _sem = asyncio.Semaphore(settings.max_concurrent_jobs)
    # crash recovery：上次沒跑完的 running/pending 重新排入
    with get_session() as s:
        stuck = s.exec(
            select(Job).where(Job.status.in_([JobStatus.running, JobStatus.pending]))  # type: ignore[attr-defined]
        ).all()
        for job in stuck:
            job.status = JobStatus.pending
            s.add(job)
        s.commit()
        ids = [j.id for j in stuck]
    for job_id in ids:
        _queue.put_nowait(job_id)
    asyncio.create_task(_dispatcher())
    _started = True
