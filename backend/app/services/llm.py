"""LLM 呼叫 —— OpenAI 相容介面（openai / openrouter）。

之後要接 instructor + pydantic 做結構化輸出（copyEditorAgent 那種回 JSON 的）時，
在這層之上加一個 structured() 包裝即可。
"""

from __future__ import annotations

from typing import TypeVar

import httpx
from pydantic import BaseModel

from app.settings import settings

T = TypeVar("T", bound=BaseModel)

_PROVIDER_BASE = {
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}


def _api_key(provider: str) -> str:
    return {
        "openai": settings.openai_api_key,
        "openrouter": settings.openrouter_api_key,
    }.get(provider, "")


async def chat(
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int | None = None,
) -> str:
    base = _PROVIDER_BASE.get(provider)
    key = _api_key(provider)
    if not base:
        raise RuntimeError(f"尚未支援的 provider: {provider}")
    if not key:
        raise RuntimeError(f"provider {provider} 的 API key 未設定（檢查 backend/.env）")

    # R2 舊設定 maxTokens=1000000（其實是 context，非 output）。
    # 思考型模型（gemini-2.5-pro）reasoning 會吃 output 預算 → 給足夠額度避免 content 空。
    if not max_tokens:
        max_tokens = 32000
    max_tokens = min(max_tokens, 64000)

    payload: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {"Authorization": f"Bearer {key}"}
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://blocktempo.ai"
        headers["X-Title"] = "BD Content Platform"

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(f"{base}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
    choice = data["choices"][0]
    content = choice.get("message", {}).get("content")
    if not content:
        raise RuntimeError(
            f"LLM 回傳空內容（finish_reason={choice.get('finish_reason')}）"
        )
    return content


async def structured(
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
    temperature: float = 0.3,
    max_tokens: int | None = None,
) -> T:
    """結構化輸出 —— instructor + pydantic。

    LLM 回的 JSON 在邊界就被 pydantic 驗證（驗不過自動重問），
    這就是殺掉舊系統「LLM 回壞 JSON → 下游爆掉」那類 bug 的關鍵。
    """
    import instructor
    from openai import AsyncOpenAI

    base = _PROVIDER_BASE.get(provider)
    key = _api_key(provider)
    if not base or not key:
        raise RuntimeError(f"provider {provider} 未設定 base/key")

    if not max_tokens:
        max_tokens = 32000
    max_tokens = min(max_tokens, 64000)

    client = instructor.from_openai(
        AsyncOpenAI(base_url=base, api_key=key), mode=instructor.Mode.JSON
    )
    return await client.chat.completions.create(
        model=model,
        response_model=response_model,
        max_retries=2,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
