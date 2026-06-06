"""統一進稿入口：{"file": 路徑} 或 {"url": 網址} → markdown 文字。所有 workflow 的 extract 階段共用。"""

from __future__ import annotations

import asyncio

from app.services.extract import extract_document
from app.services.url_extract import extract_url


async def ingest_markdown(data: dict) -> str:
    if data.get("file"):
        return await asyncio.to_thread(extract_document, data["file"])
    if data.get("url"):
        return await extract_url(data["url"])
    raise ValueError('輸入需含 "file"（本機路徑）或 "url"（網址）')
