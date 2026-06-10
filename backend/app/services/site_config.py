"""從 DB（SiteConfig）讀客製設定，給 workflow 套用（如頁首/頁尾免責範本）。

設定已從 Strapi 遷入 DB；讀不到就回傳安全預設，不擋流程。
"""

from __future__ import annotations

import json

from sqlmodel import select

from app.models import SiteConfig, get_session


def _all(kind: str) -> list[dict]:
    with get_session() as s:
        rows = s.exec(select(SiteConfig).where(SiteConfig.kind == kind)).all()
        return [json.loads(r.value_json) for r in rows]


def header_disclaimer(default: str = "") -> str:
    """頁首免責範本（取第一筆 active；無則預設）。"""
    for v in _all("header_disclaimer"):
        if v.get("isActive", True):
            return v.get("content") or v.get("html") or v.get("text") or default
    return default


def footer_disclaimer(default: str = "") -> str:
    for v in _all("footer_disclaimer"):
        if v.get("isActive", True):
            return v.get("content") or v.get("html") or v.get("text") or default
    return default


def has_site_config() -> bool:
    with get_session() as s:
        return s.exec(select(SiteConfig)).first() is not None
