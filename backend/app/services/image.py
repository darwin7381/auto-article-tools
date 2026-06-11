from __future__ import annotations

import base64

from app.settings import settings


async def generate_image(
    prompt: str,
    model: str = "gpt-image-2",
    size: str = "1536x1024",
    quality: str = "medium",
) -> bytes:
    """用 OpenAI 影像模型生成封面圖，回傳 PNG bytes。暫時性連線錯誤自動重試。"""
    import asyncio

    from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, InternalServerError

    # timeout 收緊：SDK 預設 600s，API 不通時 3 次重試會把階段拖到近 10 分鐘
    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=120)
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            resp = await client.images.generate(
                model=model, prompt=prompt, size=size, quality=quality, n=1
            )
            b64 = resp.data[0].b64_json
            if b64:
                return base64.b64decode(b64)
            last_err = RuntimeError("影像生成未回傳資料")
        except (APIConnectionError, APITimeoutError, InternalServerError) as exc:
            last_err = exc
        if attempt < 2:
            await asyncio.sleep(3 * (attempt + 1))
    raise RuntimeError(f"影像生成失敗（重試 3 次）：{last_err}")
