"""最小示範 workflow，純粹驗證骨架接線（stage → registry → runner → API/CLI）。

真正的稿件處理工作流之後在這個資料夾各開一個檔，照樣 register() 即可。
"""

from __future__ import annotations

import asyncio

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage


async def _uppercase(data: dict, ctx: RunContext) -> dict:
    await asyncio.sleep(0.2)  # 模擬 IO（之後換成真的 LLM 呼叫）
    return {"text": str((data or {}).get("text", "")).upper()}


async def _exclaim(data: dict, ctx: RunContext) -> dict:
    await asyncio.sleep(0.2)
    return {"text": data["text"] + "!!!"}


register(
    Workflow(
        name="echo",
        description="示範：大寫化 + 加驚嘆號（骨架驗證用）",
        stages=[
            Stage(id="uppercase", run=_uppercase),
            Stage(id="exclaim", run=_exclaim),
        ],
    )
)
