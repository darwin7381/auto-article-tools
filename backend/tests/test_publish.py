"""WordPress 發布 —— publish_post 純邏輯(mock httpx,不打真 WP)。"""

from __future__ import annotations

import httpx
import pytest


class _Resp:
    def __init__(self, status=200, data=None, content=b"", headers=None):
        self.status_code = status
        self._data = data or {}
        self.content = content
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("e", request=httpx.Request("POST", "http://wp"), response=self)  # type: ignore[arg-type]

    def json(self):
        return self._data


class _Client:
    def __init__(self, calls, media_id=55, media_fail=False):
        self._calls = calls
        self._media_id = media_id
        self._media_fail = media_fail

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, **kw):
        return _Resp(200, content=b"imgbytes", headers={"content-type": "image/png"})

    async def post(self, url, auth=None, content=None, headers=None, json=None):
        if url.endswith("/media"):
            if self._media_fail:
                raise RuntimeError("media upload boom")
            return _Resp(200, {"id": self._media_id})
        self._calls["payload"] = json          # /posts
        return _Resp(200, {"id": 321, "link": "http://wp/p/321", "status": json["status"]})


@pytest.fixture(autouse=True)
def _patch_wp(monkeypatch):
    from app.services import wordpress as wp
    monkeypatch.setattr(wp, "_base", lambda: "http://wp/wp-json/wp/v2")
    monkeypatch.setattr(wp, "_auth", lambda: ("u", "p"))


def _patch_client(monkeypatch, calls, **kw):
    from app.services import wordpress as wp
    monkeypatch.setattr(wp.httpx, "AsyncClient", lambda **k: _Client(calls, **kw))


async def test_publish_basic_payload(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls)
    wp = {"title": "標題", "content": "<p>內文</p>", "excerpt": "摘要", "slug": "hello",
          "categories": [{"id": 1}, {"id": 2}], "tags": [{"id": 9}], "author": 2}
    out = await publish_post(wp, status="draft")
    p = calls["payload"]
    assert p["title"] == "標題" and p["status"] == "draft" and p["slug"] == "hello"
    assert p["categories"] == [1, 2] and p["tags"] == [9] and p["author"] == 2
    assert out == {"id": 321, "link": "http://wp/p/321", "status": "draft", "featured_media": None}


async def test_publish_status_publish(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls)
    out = await publish_post({"title": "t", "content": "c"}, status="publish")
    assert calls["payload"]["status"] == "publish" and out["status"] == "publish"


async def test_publish_future_with_date(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls)
    await publish_post({"title": "t", "content": "c", "date": "2026-07-01T09:00:00"}, status="future")
    assert calls["payload"]["date"] == "2026-07-01T09:00:00"


async def test_publish_categories_tags_filter_missing_id(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls)
    await publish_post({"title": "t", "content": "c", "categories": [{"id": 1}, {"name": "x"}]}, status="draft")
    assert calls["payload"]["categories"] == [1]   # 無 id 的被濾掉


async def test_publish_media_from_url_sets_featured(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls, media_id=77)
    out = await publish_post({"title": "t", "content": "c"}, status="draft",
                             cover_image_url="http://x/cover.png")
    assert calls["payload"]["featured_media"] == 77 and out["featured_media"] == 77


async def test_publish_media_failure_does_not_block(monkeypatch):
    from app.services.wordpress import publish_post

    calls = {}
    _patch_client(monkeypatch, calls, media_fail=True)
    out = await publish_post({"title": "t", "content": "c"}, status="draft",
                             cover_image_url="http://x/cover.png")
    assert "featured_media" not in calls["payload"]   # 封面失敗不擋發稿
    assert out["id"] == 321 and out["featured_media"] is None
