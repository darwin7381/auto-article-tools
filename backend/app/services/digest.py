"""每日晨報 —— AI 主理人的主動彙報:今天該注意什麼、卡在誰手上、額度與到期預警。

取代 DM 靠記性的部分:每天早上把「待人動作 / 今日截止 / 逾期 / 排程今天發 /
Banner 到期 / 合約快到期或額度快用完」整理成一則訊息(API 可查、Telegram 可推)。
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models import (
    STATUS_META,
    Column,
    ColumnKind,
    Contract,
    Task,
    TaskStatus,
    get_session,
)
from app.services.board import contract_usage
from app.settings import settings

# 需要人動作的細狀態 → 誰
_HUMAN_ACTION_STATUSES = {
    TaskStatus.awaiting_upload.value: "編輯部",
    TaskStatus.draft_done.value: "編輯部(主審)",
    TaskStatus.awaiting_line.value: "編輯部",
    TaskStatus.client_review.value: "BD(客戶過稿)",
    TaskStatus.awaiting_bd_close.value: "BD(回傳客戶)",
    TaskStatus.quota_check.value: "確認額度",
}


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _local_today_bounds(now_utc: datetime) -> tuple[datetime, datetime]:
    """回傳「業務時區的今天」對應的 UTC 起訖。"""
    off = timedelta(hours=settings.timezone_offset_hours)
    local = now_utc + off
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_local - off, start_local + timedelta(days=1) - off


def build_digest(now_utc: datetime | None = None) -> dict:
    now = _as_utc(now_utc) or datetime.now(timezone.utc)
    day_start, day_end = _local_today_bounds(now)
    with get_session() as s:
        archive_cols = {c.id for c in s.exec(
            select(Column).where(Column.kind.in_([ColumnKind.done, ColumnKind.archive]))  # type: ignore[attr-defined]
        ).all()}
        tasks = [t for t in s.exec(select(Task)).all()]
        open_tasks = [t for t in tasks if t.column_id not in archive_cols]
        # 等待 BD 結案掛在 done 欄,但仍是待人動作 → 撈回來
        waiting_close = [t for t in tasks if (t.status or "") == TaskStatus.awaiting_bd_close.value]

        def brief(t: Task) -> dict:
            return {"id": t.id, "title": t.title, "client": t.client,
                    "status": t.status or "", "status_label": STATUS_META.get(t.status or "", {}).get("label", "")}

        human_action: dict[str, list[dict]] = {}
        for t in open_tasks + waiting_close:
            who = _HUMAN_ACTION_STATUSES.get(t.status or "")
            if who:
                human_action.setdefault(who, []).append(brief(t))

        due_today, overdue, scheduled_today, takedown_due = [], [], [], []
        for t in open_tasks:
            for field in ("draft_deadline", "publish_deadline"):
                dl = _as_utc(getattr(t, field))
                if dl is None:
                    continue
                item = {**brief(t), "deadline": dl.isoformat(), "which": field}
                if dl < now:
                    overdue.append(item)
                elif day_start <= dl < day_end:
                    due_today.append(item)
            sched = _as_utc(t.scheduled_publish_at)
            if sched is not None and day_start <= sched < day_end:
                scheduled_today.append({**brief(t), "at": sched.isoformat()})
            tdd = _as_utc(t.takedown_date)
            if tdd is not None and tdd < day_end:
                takedown_due.append({**brief(t), "takedown": tdd.isoformat()})

        contract_alerts = []
        for c in s.exec(select(Contract)).all():
            end = _as_utc(c.end_date)
            if end is not None and now <= end <= now + timedelta(days=14):
                contract_alerts.append({"id": c.id, "client": c.client, "name": c.name,
                                        "kind": "expiry", "end_date": end.isoformat()})
            for cat, u in contract_usage(s, c.id).items():
                if u["total"] > 0 and 0 <= u["remaining"] <= 1:
                    contract_alerts.append({"id": c.id, "client": c.client, "name": c.name,
                                            "kind": "quota_low", "category": cat, **u})

    return {
        "generated_at": now.isoformat(),
        "open_count": len(open_tasks),
        "human_action": human_action,
        "due_today": due_today,
        "overdue": overdue,
        "scheduled_today": scheduled_today,
        "takedown_due": takedown_due,
        "contract_alerts": contract_alerts,
    }


def digest_text(d: dict) -> str:
    """晨報的 Telegram 文字版。"""
    lines = [f"☀️ BD Delivery 晨報 · 進行中 {d['open_count']} 件"]
    if d["overdue"]:
        lines.append(f"\n🔴 已逾期 {len(d['overdue'])} 件:")
        lines += [f"  · {x['client'] or x['title']} — {x['status_label'] or '未設狀態'}" for x in d["overdue"][:8]]
    if d["due_today"]:
        lines.append(f"\n⏰ 今日截止 {len(d['due_today'])} 件:")
        lines += [f"  · {x['client'] or x['title']}" for x in d["due_today"][:8]]
    if d["scheduled_today"]:
        lines.append(f"\n📤 今日排程發佈 {len(d['scheduled_today'])} 件:")
        lines += [f"  · {x['client'] or x['title']}" for x in d["scheduled_today"][:8]]
    if d["takedown_due"]:
        lines.append(f"\n📥 Banner 到期應下架 {len(d['takedown_due'])} 件:")
        lines += [f"  · {x['client'] or x['title']}" for x in d["takedown_due"][:5]]
    for who, items in d["human_action"].items():
        lines.append(f"\n👤 待 {who}({len(items)}):")
        lines += [f"  · {x['client'] or x['title']} — {x['status_label']}" for x in items[:8]]
    if d["contract_alerts"]:
        lines.append(f"\n📑 合約預警 {len(d['contract_alerts'])}:")
        for a in d["contract_alerts"][:6]:
            if a["kind"] == "expiry":
                lines.append(f"  · {a['client']} {a['name']} — {a['end_date'][:10]} 到期")
            else:
                lines.append(f"  · {a['client']} {a['name']} — {a['category']} 額度剩 {a['remaining']}")
    if len(lines) == 1:
        lines.append("今天沒有逾期、沒有待辦堆積 — 一切在軌道上 ✅")
    return "\n".join(lines)
