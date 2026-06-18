"""輕量 eval / 回歸 —— 跑一條 article,對產出做結構不變式評分 + per-stage 耗時/tokens。

用途:prompt 或流程改動後,跑同一份 golden 稿件,確認沒退步(標題/slug/分類標籤齊全、
繁中、押註/dropcap/引言/相關閱讀都在)。CLI:`uv run python cli.py eval --file ...`。
"""

from __future__ import annotations

import re

_CJK = re.compile(r"[一-鿿]")


def cjk_ratio(text: str) -> float:
    stripped = re.sub(r"\s", "", text)
    if not stripped:
        return 0.0
    return len(_CJK.findall(stripped)) / len(stripped)


def score_result(result: dict, stages: list[dict] | None = None) -> dict:
    """對 article 結果做結構不變式檢查,回傳 {checks, passed, failed, metrics}。"""
    wp = result.get("wordpress") or {}
    content = wp.get("content", "") or ""
    checks = {
        "有標題": bool(wp.get("title")),
        "有英文 slug": bool(re.fullmatch(r"[a-z0-9-]+", wp.get("slug", "") or "")),
        "有分類": bool(wp.get("categories")),
        "有標籤": bool(wp.get("tags")),
        "有摘要": bool(wp.get("excerpt")),
        "內文為繁中(>50%)": cjk_ratio(content) > 0.5,
        "引言區塊": 'class="intro_quote"' in content,
        "Dropcap": 'class="dropcap' in content,
        "相關閱讀": "相關報導" in content,
        "有特色圖": bool((wp.get("featured_image") or {}).get("url") or result.get("cover_image_url")),
        "有成稿輸出": bool(result.get("output_url")),
    }
    metrics: dict = {
        "content_chars": len(content),
        "excerpt_chars": len(wp.get("excerpt", "") or ""),
    }
    if stages:
        metrics["total_ms"] = sum(s.get("elapsed_ms") or 0 for s in stages)
        metrics["total_tokens"] = sum(s.get("tokens") or 0 for s in stages)
        metrics["per_stage"] = [
            {"id": s.get("id"), "ms": s.get("elapsed_ms"), "tokens": s.get("tokens")}
            for s in stages
        ]
    passed = [k for k, v in checks.items() if v]
    failed = [k for k, v in checks.items() if not v]
    return {"checks": checks, "passed": len(passed), "failed": failed,
            "score": f"{len(passed)}/{len(checks)}", "metrics": metrics}
