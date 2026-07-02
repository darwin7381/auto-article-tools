"""客戶 360 API —— 按客戶聚合合約(額度)/ 稿件 / 發佈連結 / 版位檔期。"""

from __future__ import annotations

from fastapi import APIRouter

from app.services import board as svc

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
async def clients_overview() -> list[dict]:
    return svc.clients_overview()
