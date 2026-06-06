from __future__ import annotations

import base64

from app.settings import settings


async def generate_image(
    prompt: str,
    model: str = "gpt-image-2",
    size: str = "1536x1024",
    quality: str = "medium",
) -> bytes:
    """用 OpenAI 影像模型生成封面圖，回傳 PNG bytes。"""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    resp = await client.images.generate(
        model=model, prompt=prompt, size=size, quality=quality, n=1
    )
    b64 = resp.data[0].b64_json
    if not b64:
        raise RuntimeError("影像生成未回傳資料")
    return base64.b64decode(b64)
