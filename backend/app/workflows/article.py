"""完整稿件處理工作流（復刻舊系統 8 階段的核心）。

extract → content_ai → pr_writer → format_conversion → copy_editing → cover_image → article_formatting

所有 agent 設定讀自 DB；copy_editing 用 instructor+pydantic 做結構化輸出。
封面圖壓縮(TinyPNG 選用)後落地存儲、回傳可公開 URL；組稿套 DB 的頁首/頁尾免責範本並持久化輸出。
輸入： {"file": "/path/檔案.pdf"} 或 {"url": "https://..."}
"""

from __future__ import annotations

import re

from pydantic import BaseModel, Field

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.agent_config import get_agent_config
from app.services.compress import compress_cover
from app.services.image import generate_image
from app.services.llm import chat, structured
from app.services.markdown import md_to_html
from app.services.storage import save_image, save_text


def _fill(template: str, content: str, key: str) -> str:
    """把 ${key} 換成內容；模板沒有該 placeholder 就附在後面。"""
    ph = "${" + key + "}"
    return template.replace(ph, content) if ph in template else f"{template}\n\n{content}"


_TABLE_SEP = re.compile(r"\|\s*:?-{2,}")          # markdown 表格分隔列(每表一條)
# 任何 markdown 圖片來源都要顧:抽取的內嵌圖是相對路徑(/files/images/…),
# URL 稿才是 http(s)。只認 http(s) 會漏掉「上傳檔的圖被 AI 丟掉」這條主路徑。
_IMG = re.compile(r"!\[[^\]]*\]\(\s*([^)\s]+)")


def _fidelity_guard(before: str, after: str) -> tuple[str, list[str]]:
    """偵測 AI 改寫後遺失的表格/圖片(已證實的 AI 端漏失,非抽取問題)。

    回傳 (修正後文字, warnings)。圖片以 URL 不可變、可安全重新補回(附在文末);
    表格位置會變,不自動補(避免重複/錯位),只發警示讓人工審稿時補。
    """
    warnings: list[str] = []
    bt, at = len(_TABLE_SEP.findall(before)), len(_TABLE_SEP.findall(after))
    if at < bt:
        warnings.append(f"表格 {bt}→{at}：AI 改寫時遺失 {bt - at} 個表格,請於審稿時補回")
    before_imgs = _IMG.findall(before)
    after_set = set(_IMG.findall(after))
    missing = [u for u in dict.fromkeys(before_imgs) if u not in after_set]
    if missing:
        warnings.append(f"圖片遺失 {len(missing)} 張,已自動補回文末")
        after = after.rstrip() + "\n\n" + "\n\n".join(f"![]({u})" for u in missing)
    return after, warnings


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
    from app.services.ingest import ingest

    text, image_urls = await ingest(data)  # D1:含內嵌圖片
    return {**data, "source": data.get("file") or data.get("url"),
            "markdown": text, "source_images": image_urls}


async def s_content_ai(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("contentAgent")
    up = _fill(cfg.user_prompt, data["markdown"], "markdownContent")
    out = await chat(cfg.provider, cfg.model, cfg.system_prompt, up,
                     cfg.temperature if cfg.temperature is not None else 0.3, cfg.max_tokens)
    out, warns = _fidelity_guard(data["markdown"], out)  # 偵測/補回 AI 漏掉的表格/圖片
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "markdown": out,
            **({"warnings": warns} if warns else {})}


async def s_pr_writer(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("prWriterAgent")
    up = _fill(cfg.user_prompt, data["markdown"], "markdownContent")
    out = await chat(cfg.provider, cfg.model, cfg.system_prompt, up,
                     cfg.temperature if cfg.temperature is not None else 0.4, cfg.max_tokens)
    out, warns = _fidelity_guard(data["markdown"], out)
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "markdown": out,
            **({"warnings": warns} if warns else {})}


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
    wp = dict(data.get("wordpress", {}))
    from app.services.templates import TYPE_DEFAULTS

    # D3:有原文配圖且使用者未要求一律生成 → 用原文首圖當特色圖(省成本、用真圖)
    src_imgs = data.get("source_images") or []
    if src_imgs and not data.get("force_cover"):
        url = src_imgs[0]
        wp = {**wp, "featured_image": {"url": url, "alt": wp.get("title", "")}}
        return {**data, "wordpress": wp, "cover_image_url": url, "cover_image_source": "原文首圖"}

    type_name = TYPE_DEFAULTS.get(data.get("article_type", ""), {}).get("name", "新聞稿")
    prompt = (cfg.prompt_template or "Cover image for: ${title}")
    prompt = (prompt.replace("${title}", wp.get("title", ""))
                    .replace("${contentSummary}", wp.get("excerpt", ""))
                    .replace("${articleType}", type_name))
    try:
        img = await generate_image(prompt, cfg.model or "gpt-image-2",
                                   cfg.size or "1536x1024", cfg.quality or "medium")
        img, ext = await compress_cover(img)  # 本地 Pillow 壓縮（PNG→JPEG，小 ~80%）
        path, url = save_image(img, ext)  # 落地 + 可公開 URL（本地代理或 R2）
        wp = {**wp, "featured_image": {"url": url, "alt": wp.get("title", "")}}
        return {**data, "wordpress": wp, "cover_image": path, "cover_image_url": url,
                "cover_image_bytes": len(img)}
    except Exception as exc:  # noqa: BLE001  封面圖失敗不擋整條流程
        return {**data, "cover_image": None, "cover_image_error": str(exc)}


async def s_article_formatting(data: dict, ctx: RunContext) -> dict:
    from app.services.formatting import FormatOptions, format_article
    from app.services.templates import TYPE_DEFAULTS, resolve_disclaimers

    wp = dict(data.get("wordpress", {}))
    title = wp.get("title", "")
    # 作者 ID 自動帶入(依文稿類型;廣編=1 BTEditor / 新聞=2 BTVerse,同舊版),未指定才帶
    if not wp.get("author"):
        aid = TYPE_DEFAULTS.get(data.get("article_type", "regular"), {}).get("author_id")
        if aid:
            wp["author"] = aid
    cover = data.get("cover_image_url") or data.get("cover_image")
    body = wp.get("content") or data.get("html", "")
    article_type = data.get("article_type", "regular")

    header, footer, _ = resolve_disclaimers(
        article_type,
        supplier=data.get("supplier", ""),
        header_kind=data.get("header_disclaimer"),
        footer_kind=data.get("footer_disclaimer"),
    )
    fmt = data.get("formatting", {})  # 前端「進階組稿」開關;預設全開
    opts = FormatOptions(
        headings=fmt.get("headings", True),
        intro_quote=fmt.get("intro_quote", True),
        dropcap=fmt.get("dropcap", True),
        related=fmt.get("related", True),
        sponsored=(article_type == "sponsored"),
    )
    # 進階組稿 → 寫回 wp.content（發布用的就是格式化後內容）
    formatted = format_article(
        body, excerpt=wp.get("excerpt", ""),
        header_disclaimer=header, footer_disclaimer=footer, opts=opts,
    )
    wp["content"] = formatted

    # viewer 預覽文件：標題 + 封面 + 格式化內文（含 dropcap/intro_quote 樣式)
    cover_fig = f'<figure class="featured-image"><img src="{cover}" alt="{title}"/></figure>' if cover else ""
    final_html = f"<h1>{title}</h1>\n{cover_fig}\n{formatted}"
    # viewer 檔包成完整 HTML 文件：沒有 <meta charset> 的裸 fragment 在拿不到
    # response header 的情境（手機 app 內建預覽/下載後本地開啟）會變亂碼
    doc = (
        '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>{title}</title>"
        "<style>body{max-width:760px;margin:32px auto;padding:0 20px;"
        "font-family:-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif;"
        "line-height:1.85;color:#222}img{max-width:100%;height:auto}"
        "h1{line-height:1.4}"
        ".intro_quote{border-left:3px solid #ddd;padding:6px 0 6px 14px;color:#555;font-size:15px}"
        ".dropcap{float:left;font-size:3.1em;line-height:.82;font-weight:700;"
        "padding:4px 8px 0 0}"
        ".alert{background:#fff7e6;border:1px solid #e8c97a;border-radius:8px;"
        "padding:12px 16px;color:#7a5b00}</style></head><body>"
        f"{final_html}</body></html>"
    )
    _, output_url = save_text(doc, "html")  # 輸出持久化 + viewer URL
    return {**data, "wordpress": wp, "final_html": final_html, "output_url": output_url}


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
