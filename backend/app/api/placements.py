"""廣告版位 API —— 前端 /placements 的共享持久層(取代 per-瀏覽器 localStorage)。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import placements as svc

router = APIRouter(prefix="/placements", tags=["placements"])


@router.get("")
async def list_placements() -> list[dict]:
    return svc.list_slots()


@router.put("")
async def sync_placements(items: list[dict]) -> list[dict]:
    """整份同步(前端存檔即打;以 id upsert,順序即 sort_order)。"""
    if not isinstance(items, list):
        raise HTTPException(400, "body 必須是版位陣列")
    return svc.upsert_slots(items)


@router.delete("/{slot_id}")
async def remove_placement(slot_id: str) -> dict:
    svc.delete_slot(slot_id)
    return {"ok": True}
