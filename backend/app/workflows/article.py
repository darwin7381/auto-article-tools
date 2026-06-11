"""完整稿件處理工作流（復刻舊系統 8 階段的核心）。

extract → content_ai → pr_writer → format_conversion → copy_editing → cover_image → article_formatting

所有 agent 設定讀自 DB；copy_editing 用 instructor+pydantic 做結構化輸出。
封面圖壓縮(TinyPNG 選用)後落地存儲、回傳可公開 URL；組稿套 DB 的頁首/頁尾免責範本並持久化輸出。
輸入： {"file": "/path/檔案.pdf"} 或 {"url": "https://..."}
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.agent_config import get_agent_config
from app.services.compress import compress_png
from app.services.image import generate_image
from app.services.ingest import ingest_markdown
from app.services.llm import chat, structured
from app.services.markdown import md_to_html
from app.services.storage import save_image, save_text


def _fill(template: str, content: str, key: str) -> str:
    """把 ${key} 換成內容；模板沒有該 placeholder 就附在後面。"""
    ph = "${" + key + "}"
    return template.replace(ph, content) if ph in template else f"{template}\n\n{content}"


# ---- copy_editing 的結構化輸出模型（WordPress 發布參數）----
class FeaturedImage(BaseModel):
    url: str | None = None
    alt: str | None = None


class WordPressParams(BaseModel):
    title: str
    content: str
    excerpt: str = ""
    slug: str = ""
    categories: list[dict] = Field(default_factory=list)
    tags: list[dict] = Field(default_factory=list)
    featured_image: FeaturedImage | None = None


# ---- 各階段 ----
async def s_extract(data: dict, ctx: RunContext) -> dict:
    text = await ingest_markdown(data)  # 支援 {"file": ...} 或 {"url": ...}
    return {**data, "source": data.get("file") or data.get("url"), "markdown": text}


async def s_content_ai(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("contentAgent")
    up = _fill(cfg.user_prompt, data["markdown"], "markdownContent")
    out = await chat(cfg.provider, cfg.model, cfg.system_prompt, up,
                     cfg.temperature if cfg.temperature is not None else 0.3, cfg.max_tokens)
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "markdown": out}


async def s_pr_writer(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("prWriterAgent")
    up = _fill(cfg.user_prompt, data["markdown"], "markdownContent")
    out = await chat(cfg.provider, cfg.model, cfg.system_prompt, up,
                     cfg.temperature if cfg.temperature is not None else 0.4, cfg.max_tokens)
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "markdown": out}


async def s_format_conversion(data: dict, ctx: RunContext) -> dict:
    return {**data, "html": md_to_html(data["markdown"])}


async def s_copy_editing(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("copyEditorAgent")
    up = _fill(cfg.user_prompt, data["html"], "content")
    params = await structured(cfg.provider, cfg.model, cfg.system_prompt, up, WordPressParams,
                              cfg.temperature if cfg.temperature is not None else 0.3, cfg.max_tokens)
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "wordpress": params.model_dump()}


async def s_cover_image(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("imageGeneration")
    wp = data.get("wordpress", {})
    from app.services.templates import TYPE_DEFAULTS

    type_name = TYPE_DEFAULTS.get(data.get("article_type", ""), {}).get("name", "新聞稿")
    prompt = (cfg.prompt_template or "Cover image for: ${title}")
    prompt = (prompt.replace("${title}", wp.get("title", ""))
                    .replace("${contentSummary}", wp.get("excerpt", ""))
                    .replace("${articleType}", type_name))
    try:
        img = await generate_image(prompt, cfg.model or "gpt-image-2",
                                   cfg.size or "1536x1024", cfg.quality or "medium")
        img = await compress_png(img)  # TinyPNG 壓縮（沒金鑰則原樣回傳）
        path, url = save_image(img, "png")  # 落地 + 可公開 URL（本地代理或 R2）
        wp = {**wp, "featured_image": {"url": url, "alt": wp.get("title", "")}}
        return {**data, "wordpress": wp, "cover_image": path, "cover_image_url": url,
                "cover_image_bytes": len(img)}
    except Exception as exc:  # noqa: BLE001  封面圖失敗不擋整條流程
        return {**data, "cover_image": None, "cover_image_error": str(exc)}


async def s_article_formatting(data: dict, ctx: RunContext) -> dict:
    from app.services.templates import resolve_disclaimers

    wp = data.get("wordpress", {})
    title = wp.get("title", "")
    cover = data.get("cover_image_url") or data.get("cover_image")
    body = wp.get("content") or data.get("html", "")
    # 文稿類型/押註/供稿方（輸入帶入；未帶用 regular 預設=無押註）
    header, footer, _ = resolve_disclaimers(
        data.get("article_type", "regular"),
        supplier=data.get("supplier", ""),
        header_kind=data.get("header_disclaimer"),
        footer_kind=data.get("footer_disclaimer"),
    )
    parts = [f"<h1>{title}</h1>"]
    if header:
        parts.append(f'<section class="header-disclaimer">{header}</section>')
    if cover:
        parts.append(f'<figure class="featured-image"><img src="{cover}" alt="{title}"/></figure>')
    parts.append(body)
    if footer:
        parts.append(f'<section class="footer-disclaimer">{footer}</section>')
    final_html = "\n".join(parts)
    _, output_url = save_text(final_html, "html")  # 輸出持久化 + viewer URL
    return {**data, "final_html": final_html, "output_url": output_url}


register(
    Workflow(
        name="article",
        description="完整稿件流程：抽取→AI標準化→PR潤稿→轉HTML→上稿參數→封面圖→組稿",
        stages=[
            Stage("extract", s_extract),
            Stage("content_ai", s_content_ai),
            Stage("pr_writer", s_pr_writer),
            Stage("format_conversion", s_format_conversion),
            Stage("copy_editing", s_copy_editing),
            Stage("cover_image", s_cover_image),
            Stage("article_formatting", s_article_formatting),
        ],
    )
)
