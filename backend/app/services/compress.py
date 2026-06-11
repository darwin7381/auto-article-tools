"""封面圖壓縮 —— 本地開源方案（Pillow），取代 TinyPNG API。

AI 生成的封面是照片型內容：轉 JPEG(quality 88, progressive) 通常比原 PNG 小 80%+，
視覺無感差異、零外部依賴、零網路延遲。失敗或反而變大 → 原樣回傳 PNG，不擋流程。
"""

from __future__ import annotations

import asyncio
import io


def _compress_sync(data: bytes) -> tuple[bytes, str]:
    try:
        from PIL import Image

        im = Image.open(io.BytesIO(data)).convert("RGB")
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=88, optimize=True, progressive=True)
        out = buf.getvalue()
        if len(out) < len(data):
            return out, "jpg"
    except Exception:  # noqa: BLE001  壓縮是優化，不擋流程
        pass
    return data, "png"


async def compress_cover(data: bytes) -> tuple[bytes, str]:
    """回傳 (壓縮後 bytes, 副檔名)。CPU-bound → thread pool。"""
    return await asyncio.to_thread(_compress_sync, data)
