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



@pytest.mark.asyncio
async def test_compress_cover():
    """封面壓縮(Pillow):輸出不大於原圖、仍是有效影像、副檔名合理。"""
    import io

    from PIL import Image

    from app.services.compress import compress_cover

    img = Image.new("RGB", (512, 512))
    px = img.load()
    for y in range(512):  # 照片型漸層 → JPEG 應比 PNG 小
        for x in range(512):
            px[x, y] = (x % 256, y % 256, (x + y) % 256)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    src = buf.getvalue()
    out, ext = await compress_cover(src)
    assert ext in ("jpg", "png")
    assert len(out) <= len(src)             # 只在更小時才採用,否則原樣
    Image.open(io.BytesIO(out)).verify()    # 輸出仍為有效影像


@pytest.mark.asyncio
async def test_llm_judge(monkeypatch):
    """LLM-judge:比對原文 vs 成稿,結構化回品質分 + 遺失內容(mock LLM,不打網路)。"""
    from app.services import llm as llmmod
    from app.services.evals import JudgeResult, llm_judge

    seen = {}

    async def fake_structured(provider, model, system, user, model_cls, **kw):
        seen["user"] = user
        seen["model_cls"] = model_cls
        return JudgeResult(faithfulness=60, translation=100, readability=85,
                           structure=90, overall=72,
                           missing_content=["原文表格『活動亮點』未出現於成稿"],
                           hallucinations=[], issues=[])

    monkeypatch.setattr(llmmod, "structured", fake_structured)
    res = await llm_judge("原文含表格:活動亮點 ...", "<p>成稿內文</p>",
                          "press-release", provider="openrouter", model="x")
    assert res.overall == 72 and res.faithfulness == 60
    assert res.missing_content and "活動亮點" in res.missing_content[0]
    assert "原文" in seen["user"] and "成稿" in seen["user"]  # 原文與成稿都餵進 prompt
    assert seen["model_cls"] is JudgeResult


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
