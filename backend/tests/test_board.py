"""部門看板 API + service 測試（seed / 卡片 CRUD / 移卡 / 留言 / 觸發 / job 狀態同步）。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_board_seeded_with_columns():
    with TestClient(app) as c:
        b = c.get("/board").json()
        assert b["name"]
        kinds = [col["kind"] for col in b["columns"]]
        assert kinds == ["backlog", "ready", "processing", "review", "publish", "done", "archive"]


def test_task_create_move_delete_with_activity():
    with TestClient(app) as c:
        cols = c.get("/board").json()["columns"]
        # 建卡（預設落第一欄）
        t = c.post("/board/tasks", json={"title": "數碼港新聞稿", "assignee": "Joey", "actor": "Joey"}).json()
        assert t["title"] == "數碼港新聞稿"
        assert t["column_id"] == cols[0]["id"]

        # 移到「待處理」
        moved = c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols[1]["id"], "actor": "Joey"}).json()
        assert moved["column_id"] == cols[1]["id"]

        # 活動軸記了 created + moved
        detail = c.get(f"/board/tasks/{t['id']}").json()
        kinds = {a["kind"] for a in detail["activity"]}
        assert {"created", "moved"} <= kinds

        # 刪除
        assert c.delete(f"/board/tasks/{t['id']}").json()["ok"] is True
        assert c.get(f"/board/tasks/{t['id']}").status_code == 404


def test_task_edit_and_comment():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "排社群貼文"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"priority": "urgent", "assignee": "Editor", "actor": "Joey"})
        c.post(f"/board/tasks/{t['id']}/comments", json={"body": "週五前要上", "author": "Joey"})
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert d["priority"] == "urgent"
        assert d["assignee"] == "Editor"
        assert d["comments"][0]["body"] == "週五前要上"
        assert any(a["kind"] == "commented" for a in d["activity"])


def test_run_requires_source():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "沒來源的卡", "type": "article"}).json()
        r = c.post(f"/board/tasks/{t['id']}/run", json={"actor": "Joey"})
        assert r.status_code == 400
        assert "來源" in r.json()["detail"]


def test_run_links_job_and_moves_to_processing():
    with TestClient(app) as c:
        cols = {col["kind"]: col["id"] for col in c.get("/board").json()["columns"]}
        t = c.post("/board/tasks", json={
            "title": "URL 稿", "type": "article", "source_url": "https://example.com/x",
        }).json()
        run = c.post(f"/board/tasks/{t['id']}/run", json={"actor": "Joey"}).json()
        assert run["job_id"] is not None
        assert run["column_id"] == cols["processing"]
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any(a["kind"] == "job_started" for a in d["activity"])


def test_sync_moves_to_review_on_job_done():
    """job 完成 → 掛它的卡自動移到「待審稿」。直接測 sync(不依賴外部 API)。"""
    from app.models import Job, JobStatus, Task, get_session
    from app.services import board as svc

    with TestClient(app):
        bid = svc.get_default_board_id()
        snap = svc.board_snapshot(bid)
        review_id = next(c["id"] for c in snap["columns"] if c["kind"] == "review")
        proc_id = next(c["id"] for c in snap["columns"] if c["kind"] == "processing")

        task = svc.create_task(bid, {"title": "等審稿的卡", "type": "article",
                                     "column_id": proc_id, "source_url": "https://x"}, actor="Joey")
        # 建一筆「已完成」的 job 並掛到卡
        with get_session() as s:
            job = Job(workflow="article", status=JobStatus.done, task_id=task["id"])
            s.add(job)
            s.commit()
            s.refresh(job)
            job_id = job.id
        with get_session() as s:
            tk = s.get(Task, task["id"])
            tk.job_id = job_id
            s.add(tk)
            s.commit()

        svc.sync_task_for_job(job_id)

        d = svc.task_detail(task["id"])
        assert d["column_id"] == review_id
        assert any(a["kind"] == "job_done" for a in d["activity"])
