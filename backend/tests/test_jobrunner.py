"""durable worker 內部 —— crash recovery、WAL、Semaphore 上限。"""

from __future__ import annotations

import asyncio
import json

from sqlmodel import select

from app.core.registry import WORKFLOWS, Workflow, register
from app.core.stage import Stage
from app.models import Job, JobStatus, get_session, init_db


def _step(tag):
    async def run(data, ctx):
        d = dict(data or {})
        d["trail"] = d.get("trail", "") + tag
        return d
    return run


if "test_steps" not in WORKFLOWS:
    register(Workflow(name="test_steps",
                      stages=[Stage("s1", _step("a")), Stage("s2", _step("b")), Stage("s3", _step("c"))]))


def test_wal_enabled():
    init_db()
    from app.models.job import engine
    with engine.connect() as conn:
        mode = conn.exec_driver_sql("PRAGMA journal_mode").scalar()
    assert str(mode).lower() == "wal"


async def test_crash_recovery_requeues_running_job():
    """模擬上次崩潰殘留的 running job → start_worker 重排成 pending 並跑完。"""
    import app.worker.jobrunner as jr
    init_db()
    jr._loop = None
    jr._queue = None
    jr._sem = None
    with get_session() as s:
        j = Job(workflow="test_steps", input_json=json.dumps({"trail": "R-"}), status=JobStatus.running)
        s.add(j)
        s.commit()
        s.refresh(j)
        jid = j.id

    await jr.start_worker()
    st = None
    for _ in range(80):
        await asyncio.sleep(0.05)
        with get_session() as s:
            st = s.get(Job, jid).status
        if st in (JobStatus.done, JobStatus.error):
            break
    assert st == JobStatus.done
    with get_session() as s:
        j = s.get(Job, jid)
    assert j.result_json and "R-abc" in j.result_json   # 從頭跑完三階段


async def test_semaphore_uses_configured_cap():
    import app.worker.jobrunner as jr
    from app.settings import settings
    init_db()
    with get_session() as s:                            # 清掉殘留 job,避免被 crash-recovery 佔住 sem
        for j in s.exec(select(Job)).all():
            s.delete(j)
        s.commit()
    jr._loop = None
    jr._queue = None
    jr._sem = None
    await jr.start_worker()
    assert jr._sem is not None
    assert jr._sem._value == settings.max_concurrent_jobs   # 併發上限 = 設定值
