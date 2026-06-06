from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class WorkflowEvent(BaseModel):
    """跑 workflow 時逐階段推出的進度事件。API 用 SSE 推、CLI 直接印。"""

    event: Literal["stage", "progress", "done", "error"]
    data: dict[str, Any]
