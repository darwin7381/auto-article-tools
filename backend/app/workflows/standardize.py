"""真實工作流：抽取 → AI 稿件標準化。

extract（PDF/DOCX → 文字） → content_ai（contentAgent：標準化/翻譯，讀 DB 設定）

輸入： {"file": "/path/檔案.pdf"}
"""

from __future__ import annotations

import asyncio

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.agent_config import get_agent_config
from app.services.extract import extract_document
from app.services.llm import chat


async def _extract(data: dict, ctx: RunContext) -> dict:
    path = data["file"]
    text = await asyncio.to_thread(extract_document, path)
    return {"file": path, "text": text}


async def _content_ai(data: dict, ctx: RunContext) -> dict:
    cfg = get_agent_config("contentAgent")  # 從 DB 讀，不再碰 R2
    user_prompt = cfg.user_prompt.replace("${markdownContent}", data["text"])
    output = await chat(
        provider=cfg.provider,
        model=cfg.model,
        system_prompt=cfg.system_prompt,
        user_prompt=user_prompt,
        temperature=cfg.temperature if cfg.temperature is not None else 0.3,
        max_tokens=cfg.max_tokens,
    )
    return {
        "file": data["file"],
        "model": f"{cfg.provider}/{cfg.model}",
        "source_chars": len(data["text"]),
        "result_chars": len(output),
        "markdown": output,
    }


register(
    Workflow(
        name="standardize",
        description="抽取 → AI 稿件標準化（contentAgent，設定讀自 DB）",
        stages=[
            Stage(id="extract", run=_extract),
            Stage(id="content_ai", run=_content_ai),
        ],
    )
)
