"""從 DB（SiteConfig，Strapi 匯入）讀客製設定，給 workflow 套用。

Strapi 押註 content type 的內容欄位是 `template`,且分 sponsored / press-release 兩種
(以 name 區分)。讀不到就回空,由 templates.py 退回內建預設。
"""

from __future__ import annotations

import json

from sqlmodel import select

from app.models import SiteConfig, get_session

_CONTENT_FIELDS = ("template", "content", "html", "text")  # Strapi 用 template


def _all(kind: str) -> list[dict]:
    with get_session() as s:
        rows = s.exec(select(SiteConfig).where(SiteConfig.kind == kind)).all()
        return [json.loads(r.value_json) for r in rows]


def _content(v: dict) -> str:
    for f in _CONTENT_FIELDS:
        if v.get(f):
            return str(v[f])
    return ""


def disclaimer(kind: str, name: str) -> str:
    """kind: header_disclaimer / footer_disclaimer；name: sponsored / press-release。

    依 name 比對(Strapi 每型一筆),回 template 內容;找不到回空。
    """
    for v in _all(kind):
        if v.get("isActive", True) is False:
            continue
        if v.get("name") == name or v.get("displayName", "").find(name) >= 0:
            return _content(v)
    return ""


def authors() -> list[dict]:
    return _all("author")


def has_site_config() -> bool:
    with get_session() as s:
        return s.exec(select(SiteConfig)).first() is not None


# 向後相容(舊呼叫點 / effective 端點用)——回第一筆,不分型
def header_disclaimer(default: str = "") -> str:
    for v in _all("header_disclaimer"):
        if v.get("isActive", True):
            return _content(v) or default
    return default


def footer_disclaimer(default: str = "") -> str:
    for v in _all("footer_disclaimer"):
        if v.get("isActive", True):
            return _content(v) or default
    return default
