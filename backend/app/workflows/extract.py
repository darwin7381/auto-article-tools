"""真實工作流：進稿抽取（檔案或網址 → markdown 文字）。

輸入： {"file": "/path/檔案.pdf"} 或 {"url": "https://..."}
支援：PDF / DOCX / MD / Google Docs / Medium / WeChat / 一般網站
"""

from __future__ import annotations

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.ingest import ingest_markdown


async def _extract(data: dict, ctx: RunContext) -> dict:
    text = await ingest_markdown(data)
    return {
        "source": data.get("file") or data.get("url"),
        "chars": len(text),
        "preview": text[:300],
        "text": text,
    }


register(
    Workflow(
        name="extract",
        description="進稿抽取：PDF/DOCX/MD 或 URL（Google Docs/Medium/WeChat/網站）→ 純文字",
        stages=[Stage(id="extract", run=_extract)],
    )
)
