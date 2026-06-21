"""任務系統 —— run_workflow 重跑/錯誤路徑(unit)+ API 層 404/error/rerun(durable)。"""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from app.core.registry import WORKFLOWS, Workflow, register
from app.core.stage import Stage
from app.main import app


# 註冊測試用 workflow(守門避免重複註冊)
def _step(tag):
    async def run(data, ctx):
        d = dict(data or {})
        d["trail"] = d.get("trail", "") + tag
        return d
    return run


async def _boom(data, ctx):
    raise RuntimeError("stage exploded")


if "test_steps" not in WORKFLOWS:
    register(Workflow(name="test_steps",
                      stages=[Stage("s1", _step("a")), Stage("s2", _step("b")), Stage("s3", _step("c"))]))
if "test_boom" not in WORKFLOWS:
    register(Workflow(name="test_boom", stages=[Stage("ok", _step("x")), Stage("boom", _boom)]))


# ───────────────────────── run_workflow(unit)─────────────────────────

def test_stage_index():
    from app.worker.runner import stage_index
    assert stage_index("test_steps", "s2") == 1
    assert stage_index("test_steps", "nope") == 0   # 找不到 → 0
    assert stage_index("test_steps", None) == 0


async def test_run_from_stage_skips_upstream():
    from app.worker.runner import run_workflow

    events = [e async for e in run_workflow("test_steps", {"trail": "PRE-"}, start_stage="s2")]
    done = [e.data["id"] for e in events if e.event == "stage" and e.data.get("status") == "done"]
    assert done == ["s2", "s3"]                      # s1 被跳過
    result = next(e for e in events if e.event == "done").data["result"]
    assert result["trail"] == "PRE-bc"               # 只有 s2、s3 跑


async def test_run_error_yields_error_event():
    from app.worker.runner import run_workflow

    events = [e async for e in run_workflow("test_boom", {})]
    assert events[-1].event == "error"
    msg = events[-1].data["message"]
    assert "RuntimeError" in msg and "exploded" in msg   # 帶例外類型,不是裸值


async def test_run_unknown_workflow_yields_error():
    from app.worker.runner import run_workflow

    events = [e async for e in run_workflow("does-not-exist", {})]
    assert events[-1].event == "error"


# ───────────────────────── API 層(durable)─────────────────────────

def test_get_job_404():
    with TestClient(app) as c:
        assert c.get("/jobs/99999999").status_code == 404


def _poll(c, jid):
    for _ in range(60):
        j = c.get(f"/jobs/{jid}").json()
        if j["status"] in ("done", "error"):
            return j
        time.sleep(0.1)
    raise AssertionError("job 未在時限完成")


def test_error_job_sets_status_and_error():
    with TestClient(app) as c:
        jid = c.post("/jobs", json={"workflow": "test_boom", "input": {}}).json()["id"]
        j = _poll(c, jid)
        assert j["status"] == "error" and j["error"]   # error 欄位有值


def test_rerun_from_stage_via_api():
    with TestClient(app) as c:
        jid = c.post("/jobs", json={"workflow": "test_steps", "input": {"trail": "X-"},
                                    "from_stage": "s3"}).json()["id"]
        j = _poll(c, jid)
        assert j["status"] == "done"
        assert j["start_stage"] == "s3"
        assert j["result"]["trail"] == "X-c"           # 只跑 s3,未從頭


def test_get_job_slim_vs_full():
    with TestClient(app) as c:
        jid = c.post("/jobs", json={"workflow": "test_steps", "input": {}}).json()["id"]
        _poll(c, jid)
        slim = c.get(f"/jobs/{jid}?full=false").json()
        full = c.get(f"/jobs/{jid}?full=true").json()
        assert "result" not in slim and "done_stages" in slim   # slim 不帶 result
        assert "stages" in full and full["result"] is not None   # full 帶逐階段 + result
