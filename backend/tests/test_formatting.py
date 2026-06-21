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


async def test_article_formatting_body_fallback_and_regular(_patch):
    from app.workflows import article

    # wp 無 content → 退用 data["html"];regular 無 author_id → 不寫 author
    out = await article.s_article_formatting(
        {"wordpress": {"title": "T"}, "html": "<p>來自 html 的正文</p>", "article_type": "regular"}, None)
    assert "html 的正文" in out["wordpress"]["content"]   # 退用 data["html"](首字被 dropcap 包走)
    assert "author" not in out["wordpress"]


async def test_article_formatting_cover_figure_in_final(_patch):
    from app.workflows import article

    out = await article.s_article_formatting(
        {"wordpress": {"title": "T", "content": "<p>x</p>"}, "article_type": "regular",
         "cover_image_url": "http://c/img.png"}, None)
    assert "featured-image" in out["final_html"] and "http://c/img.png" in out["final_html"]


# ───────────────────────── formatting 純函式邊界 ─────────────────────────

def test_dropcap_skips_leading_tag():
    from app.services.formatting import apply_dropcap
    out = apply_dropcap("<p><strong>動</strong>區報導</p>")
    assert 'class="dropcap' in out and ">動</span>" in out   # 跳過 <strong>,包第一個實字


def test_dropcap_no_paragraph_unchanged():
    from app.services.formatting import apply_dropcap
    assert apply_dropcap("<div>無段落</div>") == "<div>無段落</div>"


def test_insert_header_disclaimer_no_intro_prepends():
    from app.services.formatting import insert_header_disclaimer
    assert insert_header_disclaimer("<p>正文</p>", "押註").startswith("押註")


def test_build_intro_quote_empty_and_links():
    from app.services.formatting import build_intro_quote
    assert "（請補摘要引言）" in build_intro_quote("")        # 空摘要 fallback
    q = build_intro_quote("摘", context=("http://u", "前情標題"))
    assert "前情提要" in q and "http://u" in q and "前情標題" in q


def test_append_tg_custom_articles():
    from app.services.formatting import append_tg_and_related
    out = append_tg_and_related("<p>x</p>", False, articles=[("http://a", "標題A")])
    assert "標題A" in out and "http://a" in out and "blocktemponews" in out
    spon = append_tg_and_related("<p>x</p>", True, articles=[("http://a", "標題A")])
    assert "#ff0000" in spon                                  # 廣編紅連結
