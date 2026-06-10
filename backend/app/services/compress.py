"""圖片壓縮 —— TinyPNG（選用）。沒設金鑰就原樣回傳，不擋流程。"""

from __future__ import annotations

import httpx

from app.settings import settings


async def compress_png(data: bytes) -> bytes:
    """用 TinyPNG 壓縮 PNG bytes；沒金鑰或失敗則回傳原圖。"""
    if not settings.tinypng_api_key:
        return data
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.tinify.com/shrink",
                auth=("api", settings.tinypng_api_key),
                content=data,
            )
            resp.raise_for_status()
            out_url = resp.json()["output"]["url"]
            got = await client.get(out_url)
            got.raise_for_status()
            return got.content
    except Exception:  # noqa: BLE001  壓縮是優化，不該擋稿件流程
        return data
