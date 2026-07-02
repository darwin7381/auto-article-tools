"""營收認列引擎 —— BD 部門是營收單位,經營層要看得到錢。

模型(示意刊例,實收真相在 Sheet):
- 認列:可計費品項的卡片「結案」即認列一件 × 刊例價(ITEM_PRICES)。
  認列日期 = 該卡的 billed activity 時間(無則退回卡片 updated_at)。
- 在途(in-flight):進行中(未結案/未封存)的可計費卡片 × 刊例價 = 已簽未交付的收入。
- 洽談 pipeline:需求進線 / 確認額度中 的卡片 × 刊例價 = 售前管線金額。
- 合約帳面:amount(手填)優先,否則 額度×刊例 估算。

輸出給經營總覽:月營收趨勢(近 12 月)、本月/本季/YTD、客戶貢獻排行、
品項組成、續約雷達(60 天內到期合約 + 額度使用率)、團隊負載。
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models import (
    ITEM_PRICES,
    ITEM_TYPES,
    STATUS_META,
    Column,
    ColumnKind,
    Contract,
    Task,
    TaskActivity,
    TaskStatus,
    get_session,
)
from app.services.board import _pipeline_of, _quota, contract_usage
from app.settings import settings

_PRESALE_STATUSES = {TaskStatus.intake.value, TaskStatus.quota_check.value, ""}


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def price_of(item_type: str) -> int:
    return int(ITEM_PRICES.get(item_type or "", 0))


def contract_value(c: Contract) -> float:
    """合約帳面:amount 手填優先,否則 額度 × 刊例 估算。"""
    if c.amount and c.amount > 0:
        return float(c.amount)
    try:
        quota = json.loads(c.quota_json or "{}")
    except (ValueError, TypeError):
        quota = {}
    total = 0.0
    for item, meta in ITEM_TYPES.items():
        cat = meta.get("quota")
        if cat and quota.get(cat):
            total += int(quota[cat]) * price_of(item)
    return total


def _local(dt: datetime) -> datetime:
    return dt + timedelta(hours=settings.timezone_offset_hours)


def revenue_overview(now: datetime | None = None) -> dict:
    now = _as_utc(now) or datetime.now(timezone.utc)
    local_now = _local(now)
    with get_session() as s:
        cols = s.exec(select(Column)).all()
        done_ids = {c.id for c in cols if c.kind == ColumnKind.done}
        closed_ids = {c.id for c in cols if c.kind in (ColumnKind.done, ColumnKind.archive)}
        tasks = s.exec(select(Task)).all()

        # 認列日期:billed activity 優先(最後一筆),退回 updated_at
        billed_at: dict[int, datetime] = {}
        for a in s.exec(select(TaskActivity).where(TaskActivity.kind == "billed")).all():  # type: ignore[attr-defined]
            billed_at[a.task_id] = _as_utc(a.created_at) or now

        recognized: list[dict] = []   # 已認列
        inflight: list[dict] = []     # 在途(已簽未交付)
        presale: list[dict] = []      # 洽談 pipeline
        for t in tasks:
            price = price_of(t.item_type)
            if price <= 0 or not ITEM_TYPES.get(t.item_type or "", {}).get("billable"):
                continue
            row = {"task_id": t.id, "title": t.title, "client": t.client or "(未填客戶)",
                   "item_type": t.item_type, "price": price, "editor": t.editor, "bd": t.bd_owner}
            if t.column_id in done_ids:
                when = billed_at.get(t.id) or _as_utc(t.updated_at) or now
                recognized.append({**row, "at": when})
            elif t.column_id not in closed_ids:
                if (t.status or "") in _PRESALE_STATUSES:
                    presale.append(row)
                else:
                    inflight.append(row)

        # 月趨勢(近 12 個月,業務時區)
        months: list[dict] = []
        anchor = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for i in range(11, -1, -1):
            y, m = anchor.year, anchor.month - i
            while m <= 0:
                y, m = y - 1, m + 12
            key = f"{y}-{m:02d}"
            total = sum(r["price"] for r in recognized
                        if _local(r["at"]).year == y and _local(r["at"]).month == m)
            months.append({"month": key, "total": total})

        month_now = sum(r["price"] for r in recognized
                        if _local(r["at"]).year == local_now.year and _local(r["at"]).month == local_now.month)
        q_start_month = ((local_now.month - 1) // 3) * 3 + 1
        quarter = sum(r["price"] for r in recognized
                      if _local(r["at"]).year == local_now.year and _local(r["at"]).month >= q_start_month
                      and _local(r["at"]).month < q_start_month + 3)
        ytd = sum(r["price"] for r in recognized if _local(r["at"]).year == local_now.year)

        # 客戶貢獻(認列 + 在途),排行
        by_client: dict[str, dict] = {}
        for r in recognized:
            e = by_client.setdefault(r["client"], {"client": r["client"], "recognized": 0, "inflight": 0, "count": 0})
            e["recognized"] += r["price"]
            e["count"] += 1
        for r in inflight:
            e = by_client.setdefault(r["client"], {"client": r["client"], "recognized": 0, "inflight": 0, "count": 0})
            e["inflight"] += r["price"]
        clients_rank = sorted(by_client.values(), key=lambda x: -(x["recognized"] + x["inflight"]))

        # 品項組成(認列)
        by_item: dict[str, int] = {}
        for r in recognized:
            by_item[r["item_type"]] = by_item.get(r["item_type"], 0) + r["price"]

        # 續約雷達:90 天內到期的合約 + 使用率(額度用不完=衝刺;用完=續約/加購商機)
        renewal: list[dict] = []
        for c in s.exec(select(Contract)).all():
            end = _as_utc(c.end_date)
            if end is None or end < now or end > now + timedelta(days=90):
                continue
            usage = contract_usage(s, c.id)
            total_q = sum(u["total"] for u in usage.values())
            used_q = sum(u["used"] for u in usage.values())
            renewal.append({
                "id": c.id, "client": c.client, "name": c.name,
                "end_date": end.isoformat(), "days_left": max(0, (end - now).days),
                "value": contract_value(c), "quota_total": total_q, "quota_used": used_q,
                "utilization": round(used_q / total_q * 100) if total_q else None,
            })
        renewal.sort(key=lambda x: x["days_left"])

        # 團隊負載:進行中卡片(依主審 / BD),含待人動作數
        team: dict[str, dict] = {}
        for t in tasks:
            if t.column_id in closed_ids:
                continue
            for role, name in (("editor", t.editor), ("bd", t.bd_owner)):
                if not name:
                    continue
                e = team.setdefault(f"{role}:{name}", {"role": role, "name": name, "open": 0, "waiting": 0})
                e["open"] += 1
                meta = STATUS_META.get(t.status or "", {})
                if meta and role == "editor" and (t.status or "") in ("awaiting_upload", "draft_done", "awaiting_line", "awaiting_accept"):
                    e["waiting"] += 1
                if meta and role == "bd" and (t.status or "") in ("awaiting_bd_close", "client_review", "quota_check"):
                    e["waiting"] += 1

        # 合約帳面總覽
        contracts_all = s.exec(select(Contract)).all()
        book_value = sum(contract_value(c) for c in contracts_all)

    return {
        "generated_at": now.isoformat(),
        "currency": "TWD",
        "month_now": month_now, "quarter": quarter, "ytd": ytd,
        "inflight_total": sum(r["price"] for r in inflight), "inflight_count": len(inflight),
        "presale_total": sum(r["price"] for r in presale), "presale_count": len(presale),
        "book_value": book_value, "contracts_count": len(contracts_all),
        "months": months,
        "clients_rank": clients_rank[:10],
        "by_item": [{"item_type": k, "total": v} for k, v in sorted(by_item.items(), key=lambda x: -x[1])],
        "renewal_radar": renewal,
        "team_load": sorted(team.values(), key=lambda x: -x["open"]),
        "prices": ITEM_PRICES,
    }
