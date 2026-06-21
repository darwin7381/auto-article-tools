"""Strapi 匯入 —— import_all / _fetch / _entry_key(mock httpx,不打真 Strapi)。"""

from __future__ import annotations

import httpx
import pytest
from sqlmodel import select

from app.models import SiteConfig, get_session, init_db


class _Resp:
    def __init__(self, status=200, data=None):
        self.status_code = status
        self._data = data if data is not None else {"data": None}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("e", request=httpx.Request("GET", "http://s"), response=self)  # type: ignore[arg-type]

    def json(self):
        return self._data


class _Client:
    def __init__(self, behavior):
        self._b = behavior

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, params=None, headers=None):
        return self._b(url, params, headers)


@pytest.fixture
def clean(monkeypatch):
    from app.settings import settings
    monkeypatch.setattr(settings, "strapi_url", "http://strapi", raising=False)
    monkeypatch.setattr(settings, "strapi_api_token", "tok", raising=False)
    init_db()
    with get_session() as s:
        for r in s.exec(select(SiteConfig)).all():
            s.delete(r)
        s.commit()
    yield


def _patch(monkeypatch, behavior):
    from app.services import strapi
    monkeypatch.setattr(strapi.httpx, "AsyncClient", lambda **kw: _Client(behavior))


def _rows(name, tmpl="X"):
    return {"data": [{"attributes": {"name": name, "template": tmpl}}]}


async def test_import_all_inserts_then_upserts(clean, monkeypatch):
    from app.services import strapi

    def behavior(url, params, headers):
        if "header-disclaimer" in url:
            return _Resp(200, _rows("sponsored", "HDR"))
        return _Resp(200)

    _patch(monkeypatch, behavior)
    counts = await strapi.import_all()
    assert counts["header_disclaimer"] == 1
    with get_session() as s:
        rows = s.exec(select(SiteConfig).where(SiteConfig.kind == "header_disclaimer")).all()
    assert len(rows) == 1 and rows[0].key == "sponsored"

    # 再跑一次 → upsert,不重複
    counts2 = await strapi.import_all()
    assert counts2["header_disclaimer"] == 1
    with get_session() as s:
        rows = s.exec(select(SiteConfig).where(SiteConfig.kind == "header_disclaimer")).all()
    assert len(rows) == 1


async def test_import_all_401_retries_without_auth(clean, monkeypatch):
    from app.services import strapi

    def behavior(url, params, headers):
        if "footer-disclaimer" not in url:
            return _Resp(200)
        if headers:                       # 帶 token → 401
            return _Resp(401)
        return _Resp(200, _rows("sponsored", "FTR"))   # 無認證重試 → 成功

    _patch(monkeypatch, behavior)
    counts = await strapi.import_all()
    assert counts["footer_disclaimer"] == 1


async def test_import_all_endpoint_failure_marks_minus1(clean, monkeypatch):
    from app.services import strapi

    def behavior(url, params, headers):
        if "authors" in url:
            raise httpx.ConnectError("down")
        return _Resp(200)

    _patch(monkeypatch, behavior)
    counts = await strapi.import_all()
    assert counts["author"] == -1        # 該類抓取失敗標 -1,其餘照常
    assert counts["header_disclaimer"] == 0


def test_entry_key_priority():
    from app.services.strapi import _entry_key
    assert _entry_key("author", {"name": "Alice", "slug": "x"}) == "Alice"
    assert _entry_key("author", {"slug": "only-slug"}) == "only-slug"
    assert _entry_key("author", {}) == ""
