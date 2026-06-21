"""eval / 回歸 —— 兩層:

1. 結構不變式評分(score_result):快、零成本、決定論。確認沒退步(標題/slug/分類標籤、
   繁中、押註/dropcap/引言/相關閱讀都在)+ per-stage 耗時/tokens。
2. LLM-judge 品質評審(llm_judge):比對「原文 vs 成稿」,量真正的內容品質 ——
   忠實度(有沒有丟表格/段落/數據、有沒有幻覺)、翻譯、可讀性、結構。結構不變式抓不到
   「內容對不對」,這層才抓得到(例:content_ai 偶爾丟表格 → 直接出現在 missing_content)。

CLI:`uv run python cli.py eval --file ...`(加 --judge 跑 LLM-judge)。
"""

from __future__ import annotations

import re

from pydantic import BaseModel, Field

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


# ───────────────────────── LLM-judge 品質評審 ─────────────────────────

class JudgeResult(BaseModel):
    """LLM 拿 rubric 比對「原文 vs 成稿」的結構化評分(0-100)。"""

    faithfulness: int = Field(ge=0, le=100,
        description="忠實度:成稿是否完整保留原文資訊(表格/數據/段落/重點),無遺漏、無捏造")
    translation: int = Field(ge=0, le=100,
        description="翻譯/語言品質(简→繁正確、用詞自然);原文已繁中、無翻譯需求時給 100")
    readability: int = Field(ge=0, le=100, description="新聞稿語氣與可讀性")
    structure: int = Field(ge=0, le=100, description="標題/段落/結構完整度")
    overall: int = Field(ge=0, le=100, description="綜合品質")
    missing_content: list[str] = Field(default_factory=list,
        description="原文有、成稿卻缺的具體項目(某張表/某段/某組數據/某張圖)")
    hallucinations: list[str] = Field(default_factory=list,
        description="成稿有、原文卻沒有的捏造內容")
    issues: list[str] = Field(default_factory=list, description="其他品質問題")


_JUDGE_SYS = (
    "你是嚴格的繁體中文財經/區塊鏈新聞編輯品質評審。逐項比對【原文】與【成稿】,評估成稿"
    "是否忠實、完整、翻譯與語氣到位。寬鬆是大忌,寧嚴勿鬆。特別注意:原文有的表格/數據/段落/"
    "圖片,成稿是否遺失;成稿是否出現原文沒有的內容(幻覺)。只輸出符合 schema 的 JSON。"
)


def _judge_user(source: str, output: str, article_type: str) -> str:
    return (
        f"【文稿類型】{article_type}\n\n"
        f"【原文(抽取後 markdown,{{IMGn}} 為圖片佔位)】\n{source[:12000]}\n\n"
        f"【成稿(發布用 HTML)】\n{output[:12000]}\n\n"
        "逐項比對後嚴格評分(0-100)。把原文有、成稿遺失的表格/數據/段落列入 missing_content;"
        "成稿多出的捏造內容列入 hallucinations。"
    )


async def llm_judge(source: str, output: str, article_type: str = "press-release",
                    provider: str | None = None, model: str | None = None) -> JudgeResult:
    """用 LLM 比對原文與成稿,回傳結構化品質評分。

    provider/model 未指定時,沿用 copyEditorAgent 的設定(已知支援 JSON 結構化輸出的部署)。
    為避免每篇都付費,這是 opt-in(CLI --judge / 程式呼叫),非預設每跑必跑。
    """
    from app.services.llm import structured

    if not provider or not model:
        from app.services.agent_config import get_agent_config

        cfg = get_agent_config("copyEditorAgent")
        provider, model = provider or cfg.provider, model or cfg.model
    return await structured(provider, model, _JUDGE_SYS,
                            _judge_user(source, output, article_type),
                            JudgeResult, temperature=0.0, max_tokens=4000)
