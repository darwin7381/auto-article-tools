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


@router.get("/builtin")
async def builtin_templates() -> dict:
    """內建預設範本（複刻自舊版 article-templates.ts）。

    讓設定頁能「預設 vs 現用(DB)」並排對照，使用者藉此判斷是否需要開 Strapi。
    """
    from app.services.templates import (
        FOOTER_DISCLAIMERS,
        HEADER_DISCLAIMERS,
        TYPE_DEFAULTS,
    )

    return {
        "article_types": [
            {"key": k, **v} for k, v in TYPE_DEFAULTS.items()
        ],
        "header_disclaimers": HEADER_DISCLAIMERS,
        "footer_disclaimers": FOOTER_DISCLAIMERS,
    }


@router.get("/effective")
async def effective_config() -> dict:
    """目前『實際生效』的範本：DB(SiteConfig，Strapi 匯入後) 有則用 DB，否則用內建預設。

    回傳每類的來源標記（db / builtin），讓使用者一眼看出 Strapi 匯入會改變什麼。
    """
    from app.services import site_config as sc
    from app.services.templates import FOOTER_DISCLAIMERS, HEADER_DISCLAIMERS

    has_db = sc.has_site_config()
    header = sc.header_disclaimer()
    footer = sc.footer_disclaimer()
    return {
        "has_db_config": has_db,
        "header": {
            "source": "db" if header else "builtin",
            "value": header or HEADER_DISCLAIMERS.get("press-release", ""),
        },
        "footer": {
            "source": "db" if footer else "builtin",
            "value": footer or FOOTER_DISCLAIMERS.get("sponsored", ""),
        },
    }


@router.post("/import-strapi")
async def import_strapi() -> dict:
    """從本機 Strapi 抓全部設定匯入 DB（需 Strapi 開著 + STRAPI_API_TOKEN）。"""
    counts = await import_all()
    return {"imported": counts}
