"""Delivery 看板測試:seed 階段 / 稿件 CRUD / 移卡 / 留言 / 合約額度 / 觸發 / job 狀態同步 / 通知。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_board_seeded_with_delivery_stages():
    with TestClient(app) as c:
        b = c.get("/board").json()
        assert b["name"] == "Delivery 業務稿處理"
        kinds = [col["kind"] for col in b["columns"]]
        assert kinds == ["backlog", "ready", "processing", "client_review", "publish", "distribution", "done", "archive"]
        assert "item_types" in b["meta"] and "廣編稿" in b["meta"]["item_types"]


def test_item_type_derives_pipeline_and_disclaimer():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "JPEX 廣編", "item_type": "廣編稿", "client": "JPEX",
                                         "bd_owner": "Alex", "dm_owner": "Meg", "editor": "Joe"}).json()
        assert t["pipeline"] == "A"
        assert t["type"] == "article"
        assert t["article_type"] == "sponsored"
        assert t["header_disclaimer"] == "sponsored"
        # 軟文深度 → pipeline B, general
        t2 = c.post("/board/tasks", json={"title": "深度稿", "item_type": "深度"}).json()
        assert t2["pipeline"] == "B" and t2["type"] == "general"


def test_contract_quota_and_billing_on_done():
    with TestClient(app) as c:
        cols = {col["kind"]: col["id"] for col in c.get("/board").json()["columns"]}
        ct = c.post("/board/contracts", json={"client": "ApeX", "name": "年約", "mode": "年約",
                                              "quota": {"廣編": 5, "專訪": 1}}).json()
        assert ct["usage"]["廣編"]["remaining"] == 5
        t = c.post("/board/tasks", json={"title": "ApeX 廣編", "item_type": "廣編稿",
                                         "client": "ApeX", "contract_id": ct["id"]}).json()
        # 移到已結案 → 計入額度
        c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols["done"], "actor": "Meg"})
        contracts = c.get("/board/contracts").json()
        ours = next(x for x in contracts if x["id"] == ct["id"])
        assert ours["usage"]["廣編"]["used"] == 1
        assert ours["usage"]["廣編"]["remaining"] == 4
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any(a["kind"] == "billed" for a in d["activity"])


def test_news_release_not_billable():
    with TestClient(app) as c:
        cols = {col["kind"]: col["id"] for col in c.get("/board").json()["columns"]}
        ct = c.post("/board/contracts", json={"client": "X", "quota": {"廣編": 3}}).json()
        t = c.post("/board/tasks", json={"title": "人情新聞稿", "item_type": "新聞稿", "contract_id": ct["id"]}).json()
        assert t["pipeline"] == "A"
        c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols["done"]})
        # 新聞稿不扣額度
        ours = next(x for x in c.get("/board/contracts").json() if x["id"] == ct["id"])
        assert ours["usage"].get("廣編", {}).get("used", 0) == 0


def test_move_comment_delete_with_activity():
    with TestClient(app) as c:
        cols = c.get("/board").json()["columns"]
        t = c.post("/board/tasks", json={"title": "搬移測試", "actor": "Meg"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols[1]["id"], "actor": "Meg"})
        c.post(f"/board/tasks/{t['id']}/comments", json={"body": "確認額度OK", "author": "Meg"})
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert {"created", "moved", "commented"} <= {a["kind"] for a in d["activity"]}
        assert d["comments"][0]["body"] == "確認額度OK"
        assert c.delete(f"/board/tasks/{t['id']}").json()["ok"] is True
        assert c.get(f"/board/tasks/{t['id']}").status_code == 404


def test_published_urls_and_notify_bd():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "回填連結", "client": "CoinW", "bd_owner": "Jessica"}).json()
        c.post(f"/board/tasks/{t['id']}/urls", json={"urls": {"website": "https://bt/a", "tg": "https://t.me/x"}})
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert d["published_urls"]["website"] == "https://bt/a"
        # 通知 BD 回傳
        c.post(f"/board/tasks/{t['id']}/notify-bd", json={"actor": "Meg"})
        d2 = c.get(f"/board/tasks/{t['id']}").json()
        assert any(n["channel"] == "bd" for n in d2["notifications"])


def test_run_requires_source_and_links_job():
    with TestClient(app) as c:
        cols = {col["kind"]: col["id"] for col in c.get("/board").json()["columns"]}
        no_src = c.post("/board/tasks", json={"title": "無源", "item_type": "廣編稿"}).json()
        assert c.post(f"/board/tasks/{no_src['id']}/run", json={}).status_code == 400
        ok = c.post("/board/tasks", json={"title": "有源", "item_type": "廣編稿", "source_url": "https://x"}).json()
        run = c.post(f"/board/tasks/{ok['id']}/run", json={"actor": "Meg"}).json()
        assert run["job_id"] is not None
        assert run["column_id"] == cols["processing"]


def test_sync_moves_to_publish_and_notifies_editor():
    from app.models import Job, JobStatus, Task, get_session
    from app.services import board as svc

    with TestClient(app):
        bid = svc.get_default_board_id()
        snap = svc.board_snapshot(bid)
        publish_id = next(c["id"] for c in snap["columns"] if c["kind"] == "publish")
        proc_id = next(c["id"] for c in snap["columns"] if c["kind"] == "processing")
        task = svc.create_task(bid, {"title": "轉稿完成的卡", "item_type": "廣編稿", "editor": "Luci",
                                     "column_id": proc_id, "source_url": "https://x"}, actor="Meg")
        with get_session() as s:
            job = Job(workflow="article", status=JobStatus.done, task_id=task["id"])
            s.add(job)
            s.commit()
            s.refresh(job)
            jid = job.id
        with get_session() as s:
            tk = s.get(Task, task["id"])
            tk.job_id = jid
            s.add(tk)
            s.commit()
        svc.sync_task_for_job(jid)
        d = svc.task_detail(task["id"])
        assert d["column_id"] == publish_id
        assert any(a["kind"] == "job_done" for a in d["activity"])
        assert any(n["channel"] == "editor" for n in d["notifications"])
