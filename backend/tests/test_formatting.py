"""進階組稿階段 —— s_article_formatting 寫回 wp.content + 作者自動帶入 + 輸出(mock 押註/存檔)。"""

from __future__ import annotations

import pytest


@pytest.fixture
def _patch(monkeypatch):
    from app.services import templates  # resolve_disclaimers 在 stage 內 local import → patch 來源模組
    from app.workflows import article
    monkeypatch.setattr(templates, "resolve_disclaimers",
                        lambda *a, **k: ("<em>HEADER押註</em>", "FOOTER押註", "新聞稿"))
    monkeypatch.setattr(article, "save_text", lambda doc, ext: (f"/p.{ext}", f"/files/o.{ext}"))


async def test_article_formatting_writeback(_patch):
    from app.workflows import article

    data = {
        "wordpress": {"title": "標題", "content": "<h2>小標</h2>\n<p>第一段正文內容很長很長。</p>",
                      "excerpt": "這是摘要"},
        "article_type": "press-release",
    }
    out = await article.s_article_formatting(data, None)
    wp = out["wordpress"]
    assert 'class="intro_quote">這是摘要' in wp["content"]   # 引言寫回
    assert 'class="dropcap' in wp["content"]                 # dropcap 寫回
    assert "<h3>小標</h3>" in wp["content"]                  # 標題正規化 h2→h3
    assert "HEADER押註" in wp["content"]                     # 押註插入
    assert out["output_url"] == "/files/o.html"             # 成稿落地 URL
    assert "<h1>標題</h1>" in out["final_html"]             # viewer 含標題


async def test_article_formatting_author_autofill(_patch):
    from app.workflows import article

    # 新聞稿 → author_id 2;廣編 → 1(未指定才帶)
    out_news = await article.s_article_formatting(
        {"wordpress": {"title": "T", "content": "<p>x</p>"}, "article_type": "press-release"}, None)
    assert out_news["wordpress"]["author"] == 2

    out_spon = await article.s_article_formatting(
        {"wordpress": {"title": "T", "content": "<p>x</p>"}, "article_type": "sponsored"}, None)
    assert out_spon["wordpress"]["author"] == 1


async def test_article_formatting_respects_explicit_author(_patch):
    from app.workflows import article

    out = await article.s_article_formatting(
        {"wordpress": {"title": "T", "content": "<p>x</p>", "author": 99}, "article_type": "press-release"}, None)
    assert out["wordpress"]["author"] == 99               # 已指定不覆蓋
