"""真實工作流：從 PDF/DOCX/MD 抽取文字。

輸入： {"file": "/絕對或相對路徑/檔案.pdf"}
"""

from __future__ import annotations

import asyncio

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.extract import extract_document


async def _extract(data: dict, ctx: RunContext) -> dict:
    path = data["file"]
    # CPU-bound 的解析丟到 thread，避免擋住 event loop（其他工作流可同時跑）
    text = await asyncio.to_thread(extract_document, path)
    preview = text[:300]
    return {"file": path, "chars": len(text), "preview": preview, "text": text}


register(
    Workflow(
        name="extract",
        description="從 PDF/DOCX/MD 抽取純文字內容",
        stages=[Stage(id="extract", run=_extract)],
    )
)
