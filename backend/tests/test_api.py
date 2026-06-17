"""API + durable job 端到端測試（用 echo，不需外部 API）。

驗證 worker 真的把 job 跑到 done、結果存 DB、SSE/查詢可取得。
"""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from app.main import app


def test_health_and_list():
    with TestClient(app) as c:
        h = c.get("/health").json()
        assert h["status"] == "ok"
        assert "echo" in h["workflows"]
        wfs = {w["name"] for w in c.get("/workflows").json()}
        assert {"echo", "article"} <= wfs


def test_job_lifecycle_echo():
    with TestClient(app) as c:
        r = c.post("/jobs", json={"workflow": "echo", "input": {"text": "durable"}})
        assert r.status_code == 200
        job_id = r.json()["id"]

        # worker 在背景跑；輪詢直到 done
        result = None
        for _ in range(50):
            job = c.get(f"/jobs/{job_id}").json()
            if job["status"] in ("done", "error"):
                result = job
                break
            time.sleep(0.1)
        assert result is not None, "job 未在時限內完成"
        assert result["status"] == "done"
        assert result["result"]["text"] == "DURABLE!!!"


def test_job_stream_replay():
    with TestClient(app) as c:
        job_id = c.post("/jobs", json={"workflow": "echo", "input": {"text": "x"}}).json()["id"]
        for _ in range(50):
            if c.get(f"/jobs/{job_id}").json()["status"] == "done":
                break
            time.sleep(0.1)
        # 已完成的 job：stream 應重播歷史事件
        body = c.get(f"/jobs/{job_id}/stream").text
        assert "stage" in body and "done" in body


def test_unknown_workflow_404():
    with TestClient(app) as c:
        assert c.post("/jobs", json={"workflow": "nope", "input": {}}).status_code == 404


def test_config_version_lifecycle():
    """具名版本：建立→自動生效→get_agent_config 讀到→切換→刪除後回退。"""
    with TestClient(app) as c:
        scope = "agent:contentAgent"
        # 起始無版本
        assert c.get(f"/versions/{scope}").json()["active_id"] is None
        v1 = c.post(f"/versions/{scope}", json={"name": "v1", "data": {"system_prompt": "AAA", "user_prompt": "${markdownContent}"}}).json()
        v2 = c.post(f"/versions/{scope}", json={"name": "v2", "data": {"system_prompt": "BBB", "user_prompt": "${markdownContent}"}}).json()
        # 最新建立的自動生效
        assert c.get(f"/versions/{scope}").json()["active_id"] == v2["id"]
        # 切回 v1
        assert c.post(f"/versions/{scope}/{v1['id']}/activate").status_code == 200
        assert c.get(f"/versions/{scope}").json()["active_id"] == v1["id"]
        # 刪生效中的 v1 → 自動補 v2 生效
        assert c.delete(f"/versions/{scope}/{v1['id']}").status_code == 200
        assert c.get(f"/versions/{scope}").json()["active_id"] == v2["id"]
        # 清理
        c.delete(f"/versions/{scope}/{v2['id']}")
        assert c.get(f"/versions/{scope}").json()["versions"] == []
