"""設定遷移 API —— 觸發 Strapi 匯入、檢視已搬進 DB 的客製設定。"""

from __future__ import annotations

import json

from fastapi import APIRouter
from sqlmodel import select

from app.models import SiteConfig, get_session
from app.services.strapi import import_all

router = APIRouter(prefix="/site-config", tags=["site-config"])


@router.get("")
async def list_site_config(kind: str | None = None) -> list[dict]:
    with get_session() as s:
        stmt = select(SiteConfig)
        if kind:
            stmt = stmt.where(SiteConfig.kind == kind)
        rows = s.exec(stmt).all()
        return [
            {"id": r.kind + ":" + r.key, "kind": r.kind, "key": r.key,
             "value": json.loads(r.value_json), "updated_at": r.updated_at}
            for r in rows
        ]


@router.post("/import-strapi")
async def import_strapi() -> dict:
    """從本機 Strapi 抓全部設定匯入 DB（需 Strapi 開著 + STRAPI_API_TOKEN）。"""
    counts = await import_all()
    return {"imported": counts}
