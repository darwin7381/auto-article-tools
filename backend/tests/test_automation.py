"""自動化核心測試:細粒度狀態機 / 排程心跳(防重複) / 每日晨報 / 廣告版位共享持久層。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app


def _cols(c: TestClient) -> dict:
    return {col["kind"]: col["id"] for col in c.get("/board").json()["columns"]}


# ──────────────────────────── 細粒度狀態機 ────────────────────────────

def test_status_meta_exposed_in_board_meta():
    with TestClient(app) as c:
        meta = c.get("/board").json()["meta"]
        keys = {s["key"] for s in meta["statuses"]}
        assert {"intake", "awaiting_upload", "awaiting_bd_close", "closed", "scheduled"} <= keys


def test_set_status_moves_card_to_mapped_column():
    with TestClient(app) as c:
        cols = _cols(c)
        t = c.post("/board/tasks", json={"title": "狀態機卡", "item_type": "廣編稿", "client": "TestCo"}).json()
        # 設「已排程發佈」→ 卡片自動移到 publish 欄
        r = c.patch(f"/board/tasks/{t['id']}", json={"status": "scheduled", "actor": "Meg"}).json()
        assert r["status"] == "scheduled"
        assert r["status_label"] == "已排程發佈"
        assert r["column_id"] == cols["publish"]


def test_move_column_applies_default_status():
    with TestClient(app) as c:
        cols = _cols(c)
        t = c.post("/board/tasks", json={"title": "拖曳狀態卡"}).json()
        r = c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols["distribution"]}).json()
        assert r["status"] == "awaiting_social"  # 粗 → 細:套該欄預設


def test_status_notification_hook_fires():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "通知卡", "client": "HookCo", "bd_owner": "Alex"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"status": "awaiting_bd_close"})
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any("回傳客戶" in n["body"] for n in d["notifications"])


def test_site_live_sets_site_published_flag():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "官網旗標卡"}).json()
        r = c.patch(f"/board/tasks/{t['id']}", json={"status": "site_live"}).json()
        assert r["site_published"] is True


def test_status_close_bills_contract_once():
    with TestClient(app) as c:
        ct = c.post("/board/contracts", json={"client": "BillCo", "quota": {"廣編": 3}}).json()
        t = c.post("/board/tasks", json={"title": "計費卡", "item_type": "廣編稿", "contract_id": ct["id"]}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"status": "closed"})
        ours = next(x for x in c.get("/board/contracts").json() if x["id"] == ct["id"])
        assert ours["usage"]["廣編"]["used"] == 1


def test_new_g2_fields_roundtrip():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "欄位卡"}).json()
        r = c.patch(f"/board/tasks/{t['id']}", json={
            "scheduled_publish_at": "2026-07-15T02:00:00Z",
            "line_proof_url": "https://i.example/proof.png",
            "draft_doc_url": "https://docs.google.com/d/x",
            "banner_spec": '{"slot":"hp-leaderboard","size":"728×90"}',
            "placement_slot_id": "hp-leaderboard",
            "exec_sheet_ref": "Entry-執行!A12",
        }).json()
        assert r["line_proof_url"].endswith("proof.png")
        assert r["draft_doc_url"].startswith("https://docs.google")
        assert r["placement_slot_id"] == "hp-leaderboard"
        assert r["exec_sheet_ref"] == "Entry-執行!A12"
        assert r["scheduled_publish_at"] is not None


def test_contract_sheet_ref_roundtrip():
    with TestClient(app) as c:
        ct = c.post("/board/contracts", json={"client": "SheetCo", "sheet_ref": "Entry-合約!B7"}).json()
        assert ct["sheet_ref"] == "Entry-合約!B7"


# ──────────────────────────── 排程心跳引擎 ────────────────────────────

def test_scheduler_deadline_overdue_fires_once():
    from app.worker.scheduler import check_deadlines

    with TestClient(app) as c:
        past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        t = c.post("/board/tasks", json={"title": "逾期卡", "client": "LateCo",
                                         "publish_deadline": past}).json()
        now = datetime.now(timezone.utc)
        first = check_deadlines(now)
        assert first >= 1
        # 防重複:再跑一輪不會重發
        again = check_deadlines(now)
        assert again == 0
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any("已逾期" in n["body"] for n in d["notifications"])


def test_scheduler_scheduled_publish_reminder():
    from app.worker.scheduler import check_scheduled_publish

    with TestClient(app) as c:
        past = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        t = c.post("/board/tasks", json={"title": "排程發佈卡", "client": "SchedCo"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"scheduled_publish_at": past})
        now = datetime.now(timezone.utc)
        assert check_scheduled_publish(now) >= 1
        assert check_scheduled_publish(now) == 0  # 防重複
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any("排程發佈時間到" in n["body"] for n in d["notifications"])


def test_scheduler_banner_takedown():
    from app.worker.scheduler import check_banner_takedown

    with TestClient(app) as c:
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        t = c.post("/board/tasks", json={"title": "Banner 卡", "item_type": "Banner", "client": "AdCo"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"takedown_date": past})
        now = datetime.now(timezone.utc)
        assert check_banner_takedown(now) >= 1
        assert check_banner_takedown(now) == 0
        d = c.get(f"/board/tasks/{t['id']}").json()
        assert any("下架" in n["body"] for n in d["notifications"])


def test_scheduler_closed_tasks_ignored():
    from app.worker.scheduler import check_deadlines

    with TestClient(app) as c:
        cols = _cols(c)
        past = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        t = c.post("/board/tasks", json={"title": "已結案逾期卡", "publish_deadline": past}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"column_id": cols["done"]})
        check_deadlines(datetime.now(timezone.utc))
        d = c.get(f"/board/tasks/{t['id']}").json()
        # 已結案的卡不該收到逾期通知
        assert not any("已逾期" in n["body"] for n in d["notifications"])


def test_scheduler_run_once_never_raises():
    from app.worker.scheduler import run_once

    with TestClient(app):
        results = run_once()
        assert all(v >= 0 for v in results.values()), results


# ──────────────────────────── 每日晨報 ────────────────────────────

def test_digest_endpoint_shape():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "晨報卡", "client": "DigestCo"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"status": "awaiting_upload"})
        d = c.get("/board/digest").json()
        for key in ("open_count", "human_action", "due_today", "overdue",
                    "scheduled_today", "takedown_due", "contract_alerts", "text"):
            assert key in d
        assert "晨報" in d["text"]
        # awaiting_upload 是待編輯部動作
        assert any("編輯部" in who for who in d["human_action"])


# ──────────────────────────── 廣告版位共享持久層 ────────────────────────────

def test_placements_seed_and_list():
    with TestClient(app) as c:
        slots = c.get("/placements").json()
        assert len(slots) >= 18
        ids = {s["id"] for s in slots}
        assert "hp-leaderboard" in ids
        lb = next(s for s in slots if s["id"] == "hp-leaderboard")
        assert lb["surfaceName"] == "首頁"
        assert lb["size"] == "728×90"


def test_placements_bulk_upsert_and_persist():
    with TestClient(app) as c:
        slots = c.get("/placements").json()
        lb = next(s for s in slots if s["id"] == "hp-leaderboard")
        lb["client"] = "測試客戶X"
        lb["status"] = "negotiating"
        c.put("/placements", json=slots)
        after = c.get("/placements").json()
        lb2 = next(s for s in after if s["id"] == "hp-leaderboard")
        assert lb2["client"] == "測試客戶X"
        assert lb2["status"] == "negotiating"


def test_placements_upsert_new_slot_and_delete():
    with TestClient(app) as c:
        slots = c.get("/placements").json()
        slots.append({"id": "custom-new", "surface": "homepage", "surfaceName": "首頁",
                      "name": "新版位", "size": "300×250", "format": "圖片", "maxKB": 200,
                      "position": "測試", "status": "available", "client": "", "schedule": "",
                      "stage": "可售 / 待洽談", "hasMaterial": False})
        after = c.put("/placements", json=slots).json()
        assert any(s["id"] == "custom-new" for s in after)
        c.delete("/placements/custom-new")
        final = c.get("/placements").json()
        assert not any(s["id"] == "custom-new" for s in final)


# ──────────────────────────── B 線 AI 初稿 / C 線版位連動 / 指揮中心資料 ────────────────────────────

def test_draft_workflow_registered():
    from app.core.registry import get_workflow

    wf = get_workflow("draft")
    assert wf is not None
    assert [st.id for st in wf.stages] == ["draft_ai"]


def test_run_task_draft_requires_brief():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "無 brief 軟文", "item_type": "常規"}).json()
        r = c.post(f"/board/tasks/{t['id']}/draft", json={"actor": "Joe"})
        assert r.status_code == 400
        assert "brief" in r.json()["detail"]


def test_run_task_draft_enqueues_and_sets_writing():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "OKX 深度軟文", "item_type": "深度", "client": "OKX",
                                         "description": "OKX 錢包生態深度介紹,主打安全與多鏈"}).json()
        r = c.post(f"/board/tasks/{t['id']}/draft", json={"actor": "Joe"}).json()
        assert r["job_id"] is not None
        assert r["status"] == "writing"


def test_placement_sync_booked_and_release():
    with TestClient(app) as c:
        c.get("/placements")  # 確保 seed
        t = c.post("/board/tasks", json={"title": "Banner 檔期卡", "item_type": "Banner", "client": "SyncCo"}).json()
        # 綁版位 + 進入已上架 → 版位 booked、客戶同步
        c.patch(f"/board/tasks/{t['id']}", json={"placement_slot_id": "hp-footer-1", "status": "banner_live"})
        slot = next(s for s in c.get("/placements").json() if s["id"] == "hp-footer-1")
        assert slot["status"] == "booked"
        assert slot["client"] == "SyncCo"
        assert slot["stage"] == "已上架"
        # 結案 → 版位釋出
        c.patch(f"/board/tasks/{t['id']}", json={"status": "closed"})
        slot = next(s for s in c.get("/placements").json() if s["id"] == "hp-footer-1")
        assert slot["status"] == "available"
        assert slot["client"] == ""


def test_banner_check_validates_spec():
    with TestClient(app) as c:
        c.get("/placements")
        t = c.post("/board/tasks", json={"title": "規格驗證卡", "item_type": "Banner"}).json()
        # 未綁版位
        r = c.get(f"/board/tasks/{t['id']}/banner-check").json()
        assert r["ok"] is False and "未綁定版位" in r["issues"][0]
        # 綁 hp-leaderboard(728×90 / 300KB),給超規格素材
        c.patch(f"/board/tasks/{t['id']}", json={"placement_slot_id": "hp-leaderboard",
                                                 "banner_spec": '{"size":"300x250","kb":500}'})
        r = c.get(f"/board/tasks/{t['id']}/banner-check").json()
        assert r["ok"] is False
        assert any("尺寸" in i for i in r["issues"])
        assert any("超過" in i for i in r["issues"])
        # 修正成合規 + 設下架日 → ok
        c.patch(f"/board/tasks/{t['id']}", json={"banner_spec": '{"size":"728×90","kb":250}',
                                                 "takedown_date": "2026-08-01T00:00:00Z"})
        r = c.get(f"/board/tasks/{t['id']}/banner-check").json()
        assert r["ok"] is True, r


def test_global_activity_feed():
    with TestClient(app) as c:
        t = c.post("/board/tasks", json={"title": "活動流卡", "client": "FeedCo"}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"status": "awaiting_upload"})
        acts = c.get("/board/activity?limit=50").json()
        assert any(a["task_title"] == "活動流卡" for a in acts)
        sys_acts = c.get("/board/activity?limit=50&actor=system").json()
        assert all(a["actor"] == "system" for a in sys_acts)


def test_clients_overview_aggregates():
    with TestClient(app) as c:
        ct = c.post("/board/contracts", json={"client": "AggCo", "quota": {"廣編": 4}}).json()
        t = c.post("/board/tasks", json={"title": "AggCo 廣編", "item_type": "廣編稿",
                                         "client": "AggCo", "contract_id": ct["id"]}).json()
        c.patch(f"/board/tasks/{t['id']}", json={"status": "awaiting_upload"})
        clients = c.get("/clients").json()
        agg = next(x for x in clients if x["client"] == "AggCo")
        assert agg["contracts"][0]["usage"]["廣編"]["remaining"] == 4
        assert any(ot["title"] == "AggCo 廣編" for ot in agg["open_tasks"])


def test_seed_demo_idempotent_and_rich():
    with TestClient(app) as c:
        r1 = c.post("/board/seed-demo").json()
        assert r1["tasks"] >= 15 and r1["contracts"] == 4
        # 再跑一次:先清舊 demo 再種,卡片數不翻倍
        r2 = c.post("/board/seed-demo").json()
        assert r2["removed_previous"] == r1["tasks"]
        b = c.get("/board").json()
        demo_tasks = [t for t in b["tasks"] if t["creator"] == "demo-seed"]
        assert len(demo_tasks) == r2["tasks"]
        # 晨報要因 demo 資料而「活」:有逾期、有待人動作
        d = c.get("/board/digest").json()
        assert d["overdue"] and d["human_action"]
