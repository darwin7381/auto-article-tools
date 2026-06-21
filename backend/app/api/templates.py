"""內建範本 API —— 文稿類型/押註內建預設(複刻自舊版 article-templates.ts),供設定頁對照/預填。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/builtin")
async def builtin_templates() -> dict:
    from app.services.templates import FOOTER_DISCLAIMERS, HEADER_DISCLAIMERS, TYPE_DEFAULTS

    return {
        "article_types": [{"key": k, **v} for k, v in TYPE_DEFAULTS.items()],
        "header_disclaimers": HEADER_DISCLAIMERS,
        "footer_disclaimers": FOOTER_DISCLAIMERS,
    }
