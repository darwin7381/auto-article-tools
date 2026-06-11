from __future__ import annotations

import base64

from app.settings import settings


async def generate_image(
    prompt: str,
    model: str = "gpt-image-2",
    size: str = "1536x1024",
    quality: str = "medium",
) -> bytes:
    """用 OpenAI 影像模型生成封面圖，回傳 PNG bytes。

    用 streaming（partial_images）：大圖生成要 2~4 分鐘，非串流模式下連線整段
    閒置等回應，會被網路路徑上的 NAT/中介設備在 ~180s 掐斷（實測
    RemoteProtocolError @183s）。串流讓連線持續有資料流動，徹底避開。
    暫時性錯誤自動重試 3 次。
    """
    import asyncio

    from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, InternalServerError

    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=300)
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            stream = await client.images.generate(
                model=model, prompt=prompt, size=size, quality=quality, n=1,
                stream=True, partial_images=2,
            )
            final_b64: str | None = None
            partial_b64: str | None = None
            async for event in stream:
                etype = getattr(event, "type", "")
                if etype == "image_generation.partial_image":
                    partial_b64 = getattr(event, "b64_json", None) or partial_b64
                elif etype == "image_generation.completed":
                    final_b64 = getattr(event, "b64_json", None)
            b64 = final_b64 or partial_b64
            if b64:
                return base64.b64decode(b64)
            last_err = RuntimeError("影像串流結束但未收到圖片資料")
        except (APIConnectionError, APITimeoutError, InternalServerError) as exc:
            last_err = exc
        except TypeError as exc:
            # SDK 不支援 stream 參數時的保險路徑（理論上 2.41+ 都支援）
            last_err = exc
            resp = await client.images.generate(
                model=model, prompt=prompt, size=size, quality=quality, n=1
            )
            b64 = resp.data[0].b64_json
            if b64:
                return base64.b64decode(b64)
        if attempt < 2:
            await asyncio.sleep(3 * (attempt + 1))
    raise RuntimeError(f"影像生成失敗（重試 3 次）：{last_err}")
