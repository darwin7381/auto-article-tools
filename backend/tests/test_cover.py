"""封面圖 —— generate_image 串流(mock OpenAI)、s_cover_image D3/失敗不擋、compress 靜默 fallback。"""

from __future__ import annotations

import base64
import io
from types import SimpleNamespace

import pytest


def _png_b64(color="red"):
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


class _Event:
    def __init__(self, type, b64=None):
        self.type = type
        self.b64_json = b64


class _Stream:
    def __init__(self, events):
        self._events = events

    def __aiter__(self):
        async def gen():
            for e in self._events:
                yield e
        return gen()


def _patch_openai(monkeypatch, events):
    class _Images:
        async def generate(self, **kw):
            return _Stream(events)

    class _FakeOpenAI:
        def __init__(self, **kw):
            self.images = _Images()

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeOpenAI)


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    async def _s(*a, **k):
        return None
    monkeypatch.setattr("asyncio.sleep", _s)


# ───────────────────────── generate_image(串流)─────────────────────────

async def test_generate_image_returns_completed(monkeypatch):
    from app.services.image import generate_image

    b64 = _png_b64("blue")
    _patch_openai(monkeypatch, [_Event("image_generation.partial_image", _png_b64("red")),
                               _Event("image_generation.completed", b64)])
    out = await generate_image("a cover")
    assert out == base64.b64decode(b64)            # 取 completed 那張


async def test_generate_image_falls_back_to_partial(monkeypatch):
    from app.services.image import generate_image

    b64 = _png_b64("green")
    _patch_openai(monkeypatch, [_Event("image_generation.partial_image", b64)])  # 沒 completed
    out = await generate_image("a cover")
    assert out == base64.b64decode(b64)            # 退而用 partial


async def test_generate_image_no_data_raises(monkeypatch):
    from app.services.image import generate_image

    _patch_openai(monkeypatch, [])                 # 串流結束但沒圖
    with pytest.raises(RuntimeError, match="影像生成失敗"):
        await generate_image("a cover")


# ───────────────────────── s_cover_image 階段 ─────────────────────────

def _img_cfg():
    return SimpleNamespace(model="gpt-image-2", size="1536x1024", quality="medium",
                           prompt_template="封面:${title}")


async def test_cover_uses_source_image_first(monkeypatch):
    from app.workflows import article

    monkeypatch.setattr(article, "get_agent_config", lambda n: _img_cfg())
    data = {"wordpress": {"title": "標題"}, "source_images": ["http://x/a.png", "http://x/b.png"]}
    out = await article.s_cover_image(data, None)
    assert out["cover_image_url"] == "http://x/a.png"           # D3:用原文首圖
    assert out["cover_image_source"] == "原文首圖"
    assert out["wordpress"]["featured_image"]["url"] == "http://x/a.png"


async def test_cover_generates_when_no_source(monkeypatch):
    from app.workflows import article

    monkeypatch.setattr(article, "get_agent_config", lambda n: _img_cfg())

    async def fake_gen(prompt, model, size, quality):
        return b"PNGBYTES"

    async def fake_compress(data):
        return b"JPGBYTES", "jpg"

    monkeypatch.setattr(article, "generate_image", fake_gen)
    monkeypatch.setattr(article, "compress_cover", fake_compress)
    monkeypatch.setattr(article, "save_image", lambda blob, ext: (f"/p.{ext}", f"/files/c.{ext}"))
    out = await article.s_cover_image({"wordpress": {"title": "T"}, "article_type": "press-release"}, None)
    assert out["cover_image_url"] == "/files/c.jpg"
    assert out["wordpress"]["featured_image"]["url"] == "/files/c.jpg"


async def test_cover_failure_does_not_block(monkeypatch):
    from app.workflows import article

    monkeypatch.setattr(article, "get_agent_config", lambda n: _img_cfg())

    async def boom(*a, **k):
        raise RuntimeError("gen failed")

    monkeypatch.setattr(article, "generate_image", boom)
    out = await article.s_cover_image({"wordpress": {"title": "T"}, "article_type": "regular"}, None)
    assert out["cover_image"] is None
    assert "gen failed" in out["cover_image_error"]            # 失敗記錄但不丟例外


# ───────────────────────── compress 靜默 fallback ─────────────────────────

async def test_compress_corrupt_bytes_returns_original(monkeypatch):
    from app.services.compress import compress_cover

    out, ext = await compress_cover(b"not-an-image")
    assert out == b"not-an-image" and ext == "png"            # 壞資料 → 原樣回傳,不丟例外
