"""廣告版位(banner inventory)服務 —— 前端 /placements 五個子頁的共享真相。

之前版位資料只活在各人瀏覽器 localStorage(彼此看到的不一樣、seed 更新會蓋掉編輯);
這裡落成後端單一真相:首次讀取自動 seed(與前端示範資料同一份)、bulk upsert 保存、
與 C 線 Task 以 placement_slot_id 連結。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import select

from app.models import PlacementSlot, get_session

_SEED_PATH = Path(__file__).parent / "placements_seed.json"

# 前端欄位名(camelCase)↔ 模型欄位。
_FIELD_MAP = {
    "surface": "surface", "surfaceName": "surface_name", "name": "name",
    "size": "size", "format": "format", "maxKB": "max_kb", "position": "position_desc",
    "status": "status", "client": "client", "schedule": "schedule", "stage": "stage",
    "hasMaterial": "has_material", "materialColor": "material_color", "materialText": "material_text",
}


def _to_frontend(slot: PlacementSlot) -> dict:
    return {
        "id": slot.id, "surface": slot.surface, "surfaceName": slot.surface_name,
        "name": slot.name, "size": slot.size, "format": slot.format, "maxKB": slot.max_kb,
        "position": slot.position_desc, "status": slot.status, "client": slot.client,
        "schedule": slot.schedule, "stage": slot.stage, "hasMaterial": slot.has_material,
        "materialColor": slot.material_color or None, "materialText": slot.material_text or None,
        "sortOrder": slot.sort_order, "updated_at": slot.updated_at,
    }


def _apply(slot: PlacementSlot, data: dict) -> None:
    for fk, mk in _FIELD_MAP.items():
        if fk in data:
            val = data[fk]
            if mk in ("material_color", "material_text") and val is None:
                val = ""
            if mk == "has_material":
                val = bool(val)
            setattr(slot, mk, val)
    if "sortOrder" in data and data["sortOrder"] is not None:
        slot.sort_order = float(data["sortOrder"])
    slot.updated_at = datetime.now(timezone.utc)


def seed_if_empty() -> int:
    """空表 → 以前端同一份示範資料播種。回傳筆數。"""
    with get_session() as s:
        existing = s.exec(select(PlacementSlot)).first()
        if existing is not None:
            return 0
        rows = json.loads(_SEED_PATH.read_text(encoding="utf-8"))
        for i, r in enumerate(rows):
            slot = PlacementSlot(id=r["id"], sort_order=float(i))
            _apply(slot, r)
            s.add(slot)
        s.commit()
        return len(rows)


def list_slots() -> list[dict]:
    seed_if_empty()
    with get_session() as s:
        slots = s.exec(select(PlacementSlot).order_by(PlacementSlot.sort_order)).all()  # type: ignore[attr-defined]
        return [_to_frontend(x) for x in slots]


def upsert_slots(items: list[dict]) -> list[dict]:
    """bulk upsert(前端整份同步)。以 id 對齊:有則更新、無則新增;不刪除缺席的
    (避免兩個分頁互相清資料;刪除走 delete_slot)。sort_order 依傳入順序重排。"""
    with get_session() as s:
        for i, data in enumerate(items):
            sid = str(data.get("id") or "").strip()
            if not sid:
                continue
            slot = s.get(PlacementSlot, sid)
            if slot is None:
                slot = PlacementSlot(id=sid)
            _apply(slot, data)
            slot.sort_order = float(i)
            s.add(slot)
        s.commit()
    return list_slots()


def delete_slot(slot_id: str) -> None:
    with get_session() as s:
        slot = s.get(PlacementSlot, slot_id)
        if slot is not None:
            s.delete(slot)
            s.commit()
