"""eval / 回歸 —— 結構不變式評分(快、零成本、決定論)。

確認沒退步(標題/slug/分類標籤、繁中、押註/dropcap/引言/相關閱讀都在)+ per-stage 耗時/tokens。
CLI:`uv run python cli.py eval --file ...`。

內容「品質」評審(忠實度/丟內容/幻覺/翻譯/語氣)**不在這裡、也不放進專案** —— 那是開發/
評估範疇,改用 **Claude subagent(走訂閱 usage、不燒 API)**,角色定義與評估紀錄在 repo 的
`evals/`。生產端 LLM 只有 pipeline 那幾個 agent(content_ai/pr_writer/copy_editing/cover);
品質評審不是生產 agent,不該是專案內的 API 呼叫。
"""

from __future__ import annotations

import re

_CJK = re.compile(r"[一-鿿]")
_TAG = re.compile(r"<[^>]+>")
_URL = re.compile(r"https?://\S+")


def cjk_ratio(text: str) -> float:
    """量純文字的中文比例 —— 先去 HTML 標籤與 URL,否則 markup/連結會稀釋比例。"""
    plain = _URL.sub("", _TAG.sub("", text))
    stripped = re.sub(r"\s", "", plain)
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
