"""示範資料 seed —— 讓指揮中心 / 看板 / 晨報 / 預警 / 客戶 360 第一眼就是「活的」。

可重複執行:先清掉上一輪 demo 資料(task.creator=='demo-seed' / contract.notes 含 [demo])
再種新的。只動 demo 標記的資料,絕不碰真實卡片與合約。
狀態設定全程 notify=False —— 種資料不轟炸通知。
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models import Contract, Notification, Task, TaskActivity, TaskComment, TaskStatus, get_session
from app.services.board import (
    _bottom_position,
    _column_by_kind,
    _log,
    _set_status,
    _sync_placement_for_task,
    get_default_board_id,
    seed_default_board,
)
from app.models import ColumnKind

_MARK = "demo-seed"


def _clear_previous(s) -> int:
    removed = 0
    demo_tasks = [t for t in s.exec(select(Task)).all() if t.creator == _MARK]
    for t in demo_tasks:
        for model in (TaskComment, TaskActivity, Notification):
            for row in s.exec(select(model).where(model.task_id == t.id)).all():  # type: ignore[attr-defined]
                s.delete(row)
        s.delete(t)
        removed += 1
    for c in s.exec(select(Contract)).all():
        if "[demo]" in (c.notes or ""):
            s.delete(c)
    return removed


def seed_demo() -> dict:
    seed_default_board()
    board_id = get_default_board_id()
    now = datetime.now(timezone.utc)

    with get_session() as s:
        removed = _clear_previous(s)
        s.commit()

        # ── 合約(涵蓋:健康 / 額度快用完 / 快到期)──
        def contract(client: str, name: str, mode: str, quota: dict, end_days: int | None, sheet: str) -> Contract:
            c = Contract(client=client, name=name, mode=mode,
                         quota_json=json.dumps(quota, ensure_ascii=False),
                         notes="[demo] 示範資料", sheet_ref=sheet,
                         start_date=now - timedelta(days=90),
                         end_date=(now + timedelta(days=end_days)) if end_days is not None else None)
            s.add(c)
            return c

        c_binance = contract("Binance 幣安", "2026 年約", "年約", {"廣編": 12, "專訪": 2, "Banner": 4}, 240, "Entry-合約!B3")
        c_okx = contract("OKX", "半年約", "半年約", {"廣編": 6, "常規": 4}, 80, "Entry-合約!B7")
        c_nexo = contract("Nexo", "Q3 檔期", "3 個月", {"廣編": 3, "Banner": 2}, 10, "Entry-合約!B11")  # 10 天後到期
        c_mexc = contract("MEXC", "新簽月結", "Agency 月結", {"官網快訊": 8, "深度": 1}, 150, "Entry-合約!B15")
        s.commit()
        for c in (c_binance, c_okx, c_nexo, c_mexc):
            s.refresh(c)

        # ── 稿件卡(鋪滿各細狀態;含逾期 / 今日截止 / 今晚 LINE / Banner 到期)──
        backlog = _column_by_kind(s, board_id, ColumnKind.backlog)

        def card(title: str, client: str, item_type: str, status: str | None = None, *,
                 contract: Contract | None = None, bd: str = "Alex", dm: str = "", editor: str = "Joe",
                 desc: str = "", **extra) -> Task:
            t = Task(board_id=board_id, column_id=backlog.id, position=_bottom_position(s, backlog.id),
                     title=title, client=client, bd_owner=bd, dm_owner=dm, editor=editor,
                     description=desc, creator=_MARK, contract_id=contract.id if contract else None)
            from app.services.board import _apply_item_type
            if item_type:
                _apply_item_type(t, item_type)
            for k, v in extra.items():
                setattr(t, k, v)
            s.add(t)
            s.commit()
            s.refresh(t)
            _log(s, t.id, _MARK, "created", f"建立示範稿件「{title}」")
            if status:
                _set_status(s, t, status, actor=_MARK, notify=False)
            _sync_placement_for_task(s, t)
            s.add(t)
            s.commit()
            return t

        today_2200_utc = now.replace(hour=14, minute=0, second=0, microsecond=0)  # 台北 22:00
        cards = [
            # 進線 / 額度
            card("Bitget 新品發布廣編需求", "Bitget", "廣編稿", TaskStatus.intake.value,
                 desc="Bitget 推出新理財產品,需廣編一篇 + 全渠道社群"),
            card("Nexo 理財月主打廣編", "Nexo", "廣編稿", TaskStatus.quota_check.value, contract=c_nexo),
            # A 線進行中
            card("Binance Alpha 上新快訊", "Binance 幣安", "官網快訊", TaskStatus.ai_processing.value, contract=c_binance,
                 source_url="https://example.com/binance-alpha"),
            card("MEXC 平台幣月報快訊", "MEXC", "官網快訊", TaskStatus.awaiting_upload.value, contract=c_mexc),
            # B 線(撰稿段)
            card("OKX 錢包生態深度專訪", "OKX", "專訪", TaskStatus.awaiting_accept.value, editor="Luci",
                 desc="專訪 OKX Wallet 亞太負責人,主打多鏈生態與安全架構"),
            card("Binance 合規進展常規稿", "Binance 幣安", "常規", TaskStatus.writing.value, contract=c_binance, editor="胖丁",
                 desc="整理 Binance 2026 上半年各地區合規里程碑,寫成品牌敘事"),
            card("MEXC 生態深度報告", "MEXC", "深度", TaskStatus.draft_done.value, contract=c_mexc, editor="Luci",
                 desc="AI 初稿已完成,待主審精修", draft_doc_url="https://docs.google.com/d/demo-mexc"),
            card("OKX 常規稿:鏈上數據解讀", "OKX", "常規", TaskStatus.client_review.value, contract=c_okx,
                 draft_doc_url="https://docs.google.com/d/demo-okx"),
            # 排程 / 發佈段
            card("Binance 廣編:機構託管方案", "Binance 幣安", "廣編稿", TaskStatus.awaiting_schedule.value, contract=c_binance),
            card("Nexo 廣編:歐洲牌照落地", "Nexo", "廣編稿", TaskStatus.scheduled.value, contract=c_nexo,
                 scheduled_publish_at=now + timedelta(hours=3)),
            card("OKX 廣編:防詐專題", "OKX", "廣編稿", TaskStatus.awaiting_social.value, contract=c_okx,
                 site_published=True),
            card("Binance 快訊:BNB 鏈升級", "Binance 幣安", "官網快訊", TaskStatus.awaiting_line.value, contract=c_binance,
                 site_published=True, scheduled_publish_at=today_2200_utc),
            # deadline 壓力(逾期 / 今日截止)
            card("Bybit 大師賽廣編(逾期!)", "Bybit", "廣編稿", TaskStatus.awaiting_upload.value,
                 publish_deadline=now - timedelta(days=1)),
            card("Kraken 上市快訊(今日截止)", "Kraken", "官網快訊", TaskStatus.ai_processing.value,
                 publish_deadline=now + timedelta(hours=6)),
            card("OKX 專訪初稿(初稿逾期)", "OKX", "專訪", TaskStatus.writing.value, contract=c_okx, editor="Luci",
                 draft_deadline=now - timedelta(days=2)),
            # C 線 Banner(綁版位、明天到期下架)
            card("Binance 首頁 leaderboard 檔期", "Binance 幣安", "Banner", TaskStatus.banner_live.value,
                 contract=c_binance, placement_slot_id="hp-leaderboard",
                 scheduled_publish_at=now - timedelta(days=20), takedown_date=now + timedelta(days=1),
                 banner_spec='{"size":"728×90","kb":280}'),
            card("Nexo 電子報信頭檔期洽談", "Nexo", "Banner", TaskStatus.quota_check.value,
                 contract=c_nexo, placement_slot_id="nl-header",
                 banner_spec='{"size":"728×90","kb":420}'),  # 故意超規格給驗證看
            # 待 BD 結案 / 已結案(吃額度)
            card("Binance 廣編:Launchpool 專題", "Binance 幣安", "廣編稿", TaskStatus.awaiting_bd_close.value,
                 contract=c_binance, site_published=True,
                 published_urls=json.dumps({"website": "https://www.blocktempo.com/demo-1", "tg": "https://t.me/demo"})),
            card("OKX 廣編:歐盟 MiCA 解讀", "OKX", "廣編稿", TaskStatus.closed.value, contract=c_okx),
            card("OKX 廣編:出入金指南", "OKX", "廣編稿", TaskStatus.closed.value, contract=c_okx),
            card("OKX 廣編:錢包安全月", "OKX", "廣編稿", TaskStatus.closed.value, contract=c_okx),
            card("OKX 廣編:NFT 專區上線", "OKX", "廣編稿", TaskStatus.closed.value, contract=c_okx),
            card("OKX 廣編:交易大賽回顧", "OKX", "廣編稿", TaskStatus.closed.value, contract=c_okx),
            # → OKX 廣編 6 額度已用 5,額度預警會亮
        ]
        s.commit()

    return {"ok": True, "removed_previous": removed, "contracts": 4, "tasks": len(cards)}
