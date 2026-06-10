"""Strapi 設定遷移 —— 把線上客製設定抓下來匯入 DB（SiteConfig），脫離 Strapi。

涵蓋：authors / header-disclaimer-templates / footer-disclaimer-templates /
article-type-presets / default-content-setting（對應 backup-strapi.sh）。

⚠️ 需要本機 Strapi 開著 + STRAPI_API_TOKEN。執行： uv run python -m app.services.strapi
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

import httpx

from app.models import SiteConfig, get_session, init_db
from app.settings import settings

# Strapi endpoint → (SiteConfig.kind, 是否單例)
_ENDPOINTS = {
    "authors": ("author", False),
    "header-disclaimer-templates": ("header_disclaimer", False),
    "footer-disclaimer-templates": ("footer_disclaimer", False),
    "article-type-presets": ("article_type_preset", False),
    "default-content-setting": ("default_content", True),
}


async def _fetch(client: httpx.AsyncClient, ep: str, single: bool) -> list[dict]:
    url = f"{settings.strapi_url.rstrip('/')}/api/{ep}"
    params = {} if single else {"pagination[pageSize]": 1000, "populate": "*"}
    if single:
        params = {"populate": "*"}
    headers = {"Authorization": f"Bearer {settings.strapi_api_token}"} if settings.strapi_api_token else {}
    resp = await client.get(url, params=params, headers=headers)
    resp.raise_for_status()
    data = resp.json().get("data")
    if data is None:
        return []
    return [data] if single else list(data)


def _entry_key(kind: str, attrs: dict) -> str:
    for cand in ("name", "displayName", "slug", "title", "type"):
        if attrs.get(cand):
            return str(attrs[cand])
    return ""


async def import_all() -> dict[str, int]:
    """抓 Strapi 全部設定匯入 DB。回傳每類匯入筆數。"""
    init_db()
    counts: dict[str, int] = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for ep, (kind, single) in _ENDPOINTS.items():
            try:
                rows = await _fetch(client, ep, single)
            except Exception as exc:  # noqa: BLE001
                counts[kind] = -1
                print(f"⚠️  {ep} 抓取失敗：{exc}")
                continue
            with get_session() as s:
                for row in rows:
                    attrs = row.get("attributes", row)
                    key = _entry_key(kind, attrs)
                    existing = None
                    if key:
                        from sqlmodel import select

                        existing = s.exec(
                            select(SiteConfig).where(SiteConfig.kind == kind, SiteConfig.key == key)
                        ).first()
                    payload = json.dumps(attrs, ensure_ascii=False)
                    if existing:
                        existing.value_json = payload
                        existing.updated_at = datetime.now(timezone.utc)
                        s.add(existing)
                    else:
                        s.add(SiteConfig(kind=kind, key=key, value_json=payload))
                s.commit()
            counts[kind] = len(rows)
            print(f"✅ {ep} → kind={kind}: {len(rows)} 筆")
    return counts


if __name__ == "__main__":
    if not settings.strapi_api_token:
        print("⚠️  STRAPI_API_TOKEN 未設定；請先在 backend/.env 設定並確認 Strapi 開著")
    print(asyncio.run(import_all()))
