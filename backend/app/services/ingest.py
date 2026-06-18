"""統一進稿入口：{"file": 路徑} 或 {"url": 網址} → markdown 文字(含內嵌圖片)。

D1:檔案內嵌圖片抽出 → 存儲 → 把 `{{IMGn}}` 佔位符換成 markdown 圖片,圖片一路流到成稿。
回傳 (markdown, image_urls);image_urls 供 cover_image 取首圖當特色圖(D3)。
"""

from __future__ import annotations

import asyncio
import re

from app.services.extract import extract_document
from app.services.url_extract import extract_url
from app.services.storage import save_image


def _embed_images(text: str, images: list[tuple[bytes, str]]) -> tuple[str, list[str]]:
    urls: list[str] = []
    for i, (blob, ext) in enumerate(images):
        ext = (ext or "png").lower()
        if ext == "jpeg":
            ext = "jpg"
        _, url = save_image(blob, ext if ext in ("png", "jpg", "webp", "gif") else "png")
        urls.append(url)
        text = text.replace(f"{{{{IMG{i}}}}}", f"\n\n![]({url})\n\n")
    # 清掉任何未配對的殘留佔位符
    text = re.sub(r"\{\{IMG\d+\}\}", "", text)
    return text, urls


async def ingest(data: dict) -> tuple[str, list[str]]:
    """回傳 (markdown, 內嵌圖片 URL 列)。"""
    if data.get("file"):
        text, images = await asyncio.to_thread(extract_document, data["file"])
        return _embed_images(text, images)
    if data.get("url"):
        md = await extract_url(data["url"])
        urls = re.findall(r"!\[[^\]]*\]\((https?://[^)]+)\)", md)
        return md, urls
    raise ValueError('輸入需含 "file"（本機路徑）或 "url"（網址）')


async def ingest_markdown(data: dict) -> str:
    """只要 markdown(standardize / extract workflow 用)。"""
    text, _ = await ingest(data)
    return text
