"""核心引擎測試（不需外部 API）：registry / echo runner / 文件抽取。"""

from __future__ import annotations

from pathlib import Path

import pytest

import app.workflows  # noqa: F401  註冊 workflow
from app.core.registry import WORKFLOWS
from app.services.extract import extract_document
from app.worker.runner import run_workflow


def test_all_workflows_registered():
    for name in ("echo", "extract", "standardize", "article"):
        assert name in WORKFLOWS


@pytest.mark.asyncio
async def test_echo_runner():
    events = [ev async for ev in run_workflow("echo", {"text": "hi joey"})]
    kinds = [e.event for e in events]
    assert kinds[0] == "stage" and kinds[-1] == "done"
    assert events[-1].data["result"]["text"] == "HI JOEY!!!"


@pytest.mark.asyncio
async def test_runner_error_is_captured():
    # 不存在的 workflow → runner 應 yield error 事件而非 raise
    events = [ev async for ev in run_workflow("nope", {})]
    assert events[-1].event == "error"


def test_extract_md(tmp_path: Path):
    f = tmp_path / "a.md"
    f.write_text("# 標題\n\n內容一二三", encoding="utf-8")
    text, images = extract_document(str(f))
    assert "內容一二三" in text and images == []


def test_extract_rejects_unknown(tmp_path: Path):
    f = tmp_path / "a.xyz"
    f.write_text("x", encoding="utf-8")
    with pytest.raises(ValueError):
        extract_document(str(f))


def test_format_article_full():
    """進階組稿:標題正規化/引言/開頭押註位置/dropcap/TG+相關閱讀/廣編紅連結。"""
    from app.services.formatting import FormatOptions, format_article

    body = "<h2>標</h2>\n<p>第一段正文內容。</p>"
    out = format_article(body, excerpt="摘要", header_disclaimer="<em>押註</em>",
                         footer_disclaimer="", opts=FormatOptions())
    assert "<h3>標</h3>" in out                      # h2→h3
    assert 'class="intro_quote">摘要' in out         # 引言
    assert out.index("押註") > out.index("intro_quote")  # 押註在引言後
    assert 'class="dropcap' in out and ">第</span>" in out  # dropcap 首字
    assert "blocktemponews" in out and "相關報導" in out    # TG + 相關閱讀

    spon = format_article(body, excerpt="x", header_disclaimer="h",
                          footer_disclaimer="尾", opts=FormatOptions(sponsored=True))
    assert "color: #ff0000" in spon                  # 廣編紅連結
    assert "<hr />" in spon                           # 結尾押註前分隔線

    off = format_article(body, excerpt="x", header_disclaimer="", footer_disclaimer="",
                         opts=FormatOptions(headings=False, intro_quote=False, dropcap=False, related=False))
    assert "<h2>標</h2>" in off and "intro_quote" not in off and "dropcap" not in off  # 全關


def test_md_to_html_figure_wrap():
    """D2:獨立成段的圖片包成 <figure class=article-image> + lazy。"""
    from app.services.markdown import md_to_html

    html = md_to_html("文字\n\n![](https://x/a.png)\n\n更多")
    assert 'figure class="article-image"' in html and 'loading="lazy"' in html


def test_eval_scorecard():
    """eval 評分:結構不變式 + 繁中比例。"""
    from app.services.evals import cjk_ratio, score_result

    assert cjk_ratio("這是繁體中文") > 0.9
    card = score_result({
        "wordpress": {"title": "標題", "slug": "hello-world", "categories": [{"id": 1}],
                      "tags": [{"id": 2}], "excerpt": "摘要",
                      "content": '<p class="intro_quote">引</p><p><span class="dropcap ">本</span>文很長很長</p>相關報導',
                      "featured_image": {"url": "x"}},
        "output_url": "/files/output/x.html",
    }, [{"id": "extract", "elapsed_ms": 100, "tokens": 0}])
    assert card["passed"] >= 9 and card["metrics"]["total_ms"] == 100
