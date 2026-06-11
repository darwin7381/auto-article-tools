"""URL 進稿 —— 網址 → markdown（復刻舊系統 parse-url / process-gdocs）。

支援四類來源（同舊系統）：
1. Google Docs：`/document/d/{id}` → `export?format=docx` → python-docx 抽取
2. Medium / 3. WeChat / 4. 一般網站：抓 HTML → trafilatura 主文抽取 → markdown
"""

from __future__ import annotations

import asyncio
import re
import tempfile
from pathlib import Path

import httpx

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

_GDOC_RE = re.compile(r"docs\.google\.com/document/d/([a-zA-Z0-9_-]+)")


async def _extract_gdoc(doc_id: str) -> str:
    """Google Docs → 匯出 docx → 抽文字（文件需開連結分享）。"""
    from app.services.extract import extract_docx

    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=docx"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(export_url, headers={"User-Agent": _UA})
        resp.raise_for_status()
        if b"<html" in resp.content[:200].lower():
            raise RuntimeError("Google Docs 匯出失敗（文件可能未開連結分享權限）")
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        f.write(resp.content)
        tmp = f.name
    try:
        return await asyncio.to_thread(extract_docx, tmp)
    finally:
        Path(tmp).unlink(missing_ok=True)


def _trafilatura_md(html: str, url: str) -> str | None:
    import trafilatura

    return trafilatura.extract(
        html,
        output_format="markdown",
        include_images=True,
        include_links=True,
        include_tables=True,
        url=url,
    )


_firecrawl_bin: str | None = None


def _find_firecrawl() -> str:
    """找 firecrawl CLI 的絕對路徑。

    launchd 啟動的 process PATH 很窄（沒有 nvm/.local），不能用裸名 'firecrawl'
    ——實測在 launchd 下會 FileNotFoundError。
    """
    global _firecrawl_bin
    if _firecrawl_bin:
        return _firecrawl_bin
    import glob
    import shutil

    cand = shutil.which("firecrawl")
    if not cand:
        home = str(Path.home())
        for pat in (
            f"{home}/.nvm/versions/node/*/bin/firecrawl",
            f"{home}/.local/bin/firecrawl",
            "/opt/homebrew/bin/firecrawl",
            "/usr/local/bin/firecrawl",
            f"{home}/Library/pnpm/firecrawl",
        ):
            hits = sorted(glob.glob(pat), reverse=True)  # nvm 取最新版
            if hits:
                cand = hits[0]
                break
    if not cand:
        raise RuntimeError("找不到 firecrawl CLI（裝在 PATH 外？）；或改設 FIRECRAWL_API_KEY 走 API")
    _firecrawl_bin = cand
    return cand


async def _firecrawl_html(url: str) -> str:
    """Firecrawl fallback：過反爬牆 + 渲染 JS，回傳完整 HTML。

    目前用本機已登入的 firecrawl CLI；部署時改為 FIRECRAWL_API_KEY 直呼 API。
    """
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
        tmp = f.name
    try:
        proc = await asyncio.create_subprocess_exec(
            _find_firecrawl(), "scrape", url, "--format", "html", "-o", tmp,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
        )
        _, err = await asyncio.wait_for(proc.communicate(), timeout=90)
        if proc.returncode != 0:
            raise RuntimeError(f"firecrawl 失敗: {err.decode()[:200]}")
        return Path(tmp).read_text(encoding="utf-8")
    finally:
        Path(tmp).unlink(missing_ok=True)


_MIN_CHARS = 400  # 低於這個字數視為只抓到頁面殼（nav/footer），改走 Firecrawl


async def _extract_webpage(url: str) -> str:
    """一般網頁（Medium / WeChat / 任意網站）→ 主文抽取 → markdown。

    策略：直抓 + trafilatura；被擋（403/429）或內容過短（JS 渲染頁）→ Firecrawl 渲染後再抽。
    """
    html: str | None = None
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": _UA})
            resp.raise_for_status()
            html = resp.text
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code not in (401, 403, 429, 503):
            raise  # 404 等真錯誤直接回報，不浪費 fallback

    md = await asyncio.to_thread(_trafilatura_md, html, url) if html else None

    if not md or len(md.strip()) < _MIN_CHARS:
        # 被擋或只抓到殼 → Firecrawl 渲染後重抽
        fc_html = await _firecrawl_html(url)
        md = await asyncio.to_thread(_trafilatura_md, fc_html, url)

    if not md or len(md.strip()) < 50:
        raise RuntimeError(f"網頁主文抽取失敗或內容過短: {url}")
    return md


_DEAD_MIN = 150  # 連 fallback 都抽不到這個字數 → 連結失效/被刪，明確報錯而非帶殼頁面跑完整條 AI 流程


async def extract_url(url: str) -> str:
    m = _GDOC_RE.search(url)
    if m:
        text = await _extract_gdoc(m.group(1))
    else:
        text = await _extract_webpage(url)
    if len((text or "").strip()) < _DEAD_MIN:
        raise RuntimeError(
            f"抽取內容過短（{len((text or '').strip())} 字）——連結可能已失效、被刪除或非文章頁：{url}"
        )
    return text
