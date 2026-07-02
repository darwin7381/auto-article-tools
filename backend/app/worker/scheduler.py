"""排程心跳引擎 —— 平台的「時間驅動」中樞(之前完全沒有,一切都要人點)。

每 N 秒掃一輪(預設 60s),做 Notion+n8n 靠人與外掛做的事:
- 初稿 / 發佈 deadline:24h 內到期提醒、逾期升級提醒
- scheduled_publish_at 排程時刻到 → 提醒編輯執行發佈(發布 adapter 接上後改自動發)
- Banner takedown_date 到期 → 提醒下架
- 合約 end_date 兩週內 / 額度剩 ≤1 → 預警 BD
- 每日晨報(digest_hour_local,Asia/Taipei)推 Telegram

防重複:每個動作以唯一 key 寫 AutomationEvent,觸發過不再觸發(重啟安全、冪等)。
所有 check 各自 try/except —— 心跳絕不因單項失敗而停。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models import AutomationEvent, Column, ColumnKind, Contract, Task, TaskStatus, get_session
from app.services import notify as notify_svc
from app.services.board import contract_usage, get_default_board_id, task_dict, update_task  # noqa: F401
from app.services.digest import build_digest, digest_text
from app.settings import settings

log = logging.getLogger(__name__)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _fired(s, key: str) -> bool:
    return s.exec(select(AutomationEvent).where(AutomationEvent.key == key)).first() is not None


def _fire(s, key: str, kind: str, task_id: int | None, detail: str) -> None:
    s.add(AutomationEvent(key=key, kind=kind, task_id=task_id, detail=detail))


def _notify_task(s, task: Task, channel: str, body: str) -> None:
    """排程通知:寫 Notification log + 外送(沿用 board 服務的雙線語意)。"""
    from app.models import Notification

    target = (task.editor or "編輯") if channel == "editor" else (task.bd_owner or "BD")
    s.add(Notification(task_id=task.id, channel=channel, target=target, body=body))
    notify_svc.send_external(channel, target, body)


def _open_tasks(s) -> list[Task]:
    closed_cols = {c.id for c in s.exec(
        select(Column).where(Column.kind.in_([ColumnKind.done, ColumnKind.archive]))  # type: ignore[attr-defined]
    ).all()}
    return [t for t in s.exec(select(Task)).all() if t.column_id not in closed_cols]


def check_deadlines(now: datetime) -> int:
    """初稿 / 發佈 deadline:24h 預告 + 逾期提醒。回傳觸發數(供測試)。"""
    fired = 0
    with get_session() as s:
        for t in _open_tasks(s):
            for field, label, channel in (
                ("draft_deadline", "初稿", "editor"),
                ("publish_deadline", "發佈", "bd"),
            ):
                dl = _as_utc(getattr(t, field))
                if dl is None:
                    continue
                name = t.client or t.title
                if now < dl <= now + timedelta(hours=24):
                    key = f"{field}_due24:{t.id}"
                    if not _fired(s, key):
                        _fire(s, key, "due24", t.id, f"{label} 24h 內到期")
                        _notify_task(s, t, channel, f"⏰【{name}】{label} deadline 24 小時內到期({dl.strftime('%m/%d %H:%M')} UTC)")
                        fired += 1
                elif dl < now:
                    key = f"{field}_overdue:{t.id}"
                    if not _fired(s, key):
                        _fire(s, key, "overdue", t.id, f"{label} 已逾期")
                        _notify_task(s, t, channel, f"🔴【{name}】{label} deadline 已逾期,請立即處理")
                        fired += 1
        s.commit()
    return fired


def check_scheduled_publish(now: datetime) -> int:
    """scheduled_publish_at 到點 → 提醒執行發佈(之後接發布 adapter 改全自動)。"""
    fired = 0
    with get_session() as s:
        for t in _open_tasks(s):
            at = _as_utc(t.scheduled_publish_at)
            if at is None or at > now:
                continue
            key = f"sched_pub:{t.id}:{at.strftime('%Y%m%d%H%M')}"
            if _fired(s, key):
                continue
            _fire(s, key, "sched_pub", t.id, "排程發佈時間到")
            _notify_task(s, t, "editor", f"📤【{t.client or t.title}】排程發佈時間到({at.strftime('%m/%d %H:%M')} UTC),請執行發佈")
            fired += 1
        s.commit()
    return fired


def check_banner_takedown(now: datetime) -> int:
    fired = 0
    with get_session() as s:
        for t in _open_tasks(s):
            tdd = _as_utc(t.takedown_date)
            if tdd is None or tdd > now:
                continue
            key = f"takedown:{t.id}"
            if _fired(s, key):
                continue
            _fire(s, key, "takedown", t.id, "Banner 到期下架")
            _notify_task(s, t, "editor", f"📥【{t.client or t.title}】Banner 檔期已到期,請執行下架")
            fired += 1
        s.commit()
    return fired


def check_contracts(now: datetime) -> int:
    """合約兩週內到期 / 任一品項額度剩 ≤1 → 預警 BD(不綁卡片,直接外送 + 事件記錄)。"""
    fired = 0
    with get_session() as s:
        for c in s.exec(select(Contract)).all():
            end = _as_utc(c.end_date)
            if end is not None and now <= end <= now + timedelta(days=14):
                key = f"contract_expiry:{c.id}"
                if not _fired(s, key):
                    _fire(s, key, "contract_expiry", None, f"{c.client} {c.name} 兩週內到期")
                    notify_svc.send_external("bd", "BD", f"📑 合約預警:{c.client}「{c.name}」將於 {end.strftime('%Y/%m/%d')} 到期,額度未用完請盡快安排")
                    fired += 1
            for cat, u in contract_usage(s, c.id).items():
                if u["total"] > 0 and 0 <= u["remaining"] <= 1:
                    key = f"quota_low:{c.id}:{cat}"
                    if not _fired(s, key):
                        _fire(s, key, "quota_low", None, f"{c.client} {cat} 剩 {u['remaining']}")
                        notify_svc.send_external("bd", "BD", f"📊 額度預警:{c.client}「{c.name}」的 {cat} 額度僅剩 {u['remaining']}(共 {u['total']})")
                        fired += 1
        s.commit()
    return fired


def check_daily_digest(now: datetime) -> int:
    """業務時區每天 digest_hour_local 點後第一次心跳 → 產晨報推 TG。"""
    local = now + timedelta(hours=settings.timezone_offset_hours)
    if local.hour < settings.digest_hour_local:
        return 0
    key = f"digest:{local.strftime('%Y-%m-%d')}"
    with get_session() as s:
        if _fired(s, key):
            return 0
        _fire(s, key, "digest", None, "每日晨報")
        s.commit()
    d = build_digest(now)
    notify_svc.send_external_raw(digest_text(d))
    return 1


CHECKS = [check_deadlines, check_scheduled_publish, check_banner_takedown, check_contracts, check_daily_digest]


def run_once(now: datetime | None = None) -> dict[str, int]:
    """跑一輪所有 check(同步;async loop 用 to_thread 包)。單項失敗不影響其他。"""
    now = now or datetime.now(timezone.utc)
    results: dict[str, int] = {}
    for check in CHECKS:
        try:
            results[check.__name__] = check(now)
        except Exception as exc:  # noqa: BLE001  心跳不能死
            log.exception("scheduler check %s 失敗: %s", check.__name__, exc)
            results[check.__name__] = -1
    return results


async def start_scheduler() -> None:
    if not settings.scheduler_enabled:
        log.info("排程心跳引擎停用(SCHEDULER_ENABLED=false)")
        return

    async def _loop() -> None:
        log.info("排程心跳引擎啟動(每 %ss)", settings.scheduler_interval_seconds)
        while True:
            try:
                await asyncio.to_thread(run_once)
            except Exception as exc:  # noqa: BLE001
                log.exception("scheduler 心跳例外: %s", exc)
            await asyncio.sleep(settings.scheduler_interval_seconds)

    asyncio.create_task(_loop())
