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


# ───────────────────────── /publish 端點層(TestClient)─────────────────────────

def _make_job(result=None):
    import json
    from app.models import Job, get_session
    with get_session() as s:
        j = Job(workflow="article", input_json="{}",
                result_json=json.dumps(result) if result is not None else None)
        s.add(j)
        s.commit()
        s.refresh(j)
        return j.id


def test_upload_rejects_oversize(monkeypatch):
    from fastapi.testclient import TestClient
    from app.api import uploads
    from app.main import app
    monkeypatch.setattr(uploads, "_MAX_BYTES", 10)  # 縮小上限好測
    with TestClient(app) as c:
        r = c.post("/uploads", files={"file": ("big.pdf", b"x" * 50, "application/pdf")})
        assert r.status_code == 413


def test_upload_rejects_empty():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        r = c.post("/uploads", files={"file": ("empty.pdf", b"", "application/pdf")})
        assert r.status_code == 400


def test_upload_rejects_bad_ext():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        r = c.post("/uploads", files={"file": ("x.exe", b"data", "application/octet-stream")})
        assert r.status_code == 400


def test_publish_endpoint_404():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        assert c.post("/publish", json={"job_id": 99999999}).status_code == 404


def test_publish_endpoint_bad_status():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        assert c.post("/publish", json={"job_id": 1, "status": "bogus"}).status_code == 400


def test_publish_endpoint_no_result_400():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        jid = _make_job(None)
        r = c.post("/publish", json={"job_id": jid})
        assert r.status_code == 400 and "結果" in r.json()["detail"]


def test_publish_endpoint_no_wordpress_400():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        jid = _make_job({"something": 1})            # 有 result 但無 wordpress
        r = c.post("/publish", json={"job_id": jid})
        assert r.status_code == 400 and "wordpress" in r.json()["detail"]


def test_publish_endpoint_success_with_overrides(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    captured = {}

    async def fake_pub(wp, status="publish", cover_image_path=None, cover_image_url=None):
        captured["wp"] = wp
        captured["status"] = status
        return {"id": 7, "link": "L", "status": status, "featured_media": None}

    monkeypatch.setattr("app.api.publish.publish_post", fake_pub)
    with TestClient(app) as c:
        jid = _make_job({"wordpress": {"title": "舊標題", "content": "C"}})
        r = c.post("/publish", json={"job_id": jid, "status": "draft", "overrides": {"title": "新標題"}})
    assert r.status_code == 200 and r.json()["id"] == 7
    assert captured["wp"]["title"] == "新標題"        # 人工審稿 override 生效
    assert captured["status"] == "draft"
