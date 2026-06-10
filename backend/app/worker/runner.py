from __future__ import annotations

from typing import Any, AsyncIterator

from app.core.events import WorkflowEvent
from app.core.registry import get_workflow
from app.core.stage import RunContext


async def run_workflow(
    name: str,
    input_data: Any,
    ctx: RunContext | None = None,
) -> AsyncIterator[WorkflowEvent]:
    """跑一條 workflow，逐階段 yield 進度事件。

    這是「單一編排入口」—— API(SSE)、CLI、排程都共用這個，
    流程邏輯只有一份。
    """
    ctx = ctx or RunContext()
    data = input_data
    try:
        wf = get_workflow(name)
        for stage in wf.stages:
            yield WorkflowEvent(event="stage", data={"id": stage.id, "status": "running"})
            data = await stage.run(data, ctx)
            yield WorkflowEvent(event="stage", data={"id": stage.id, "status": "done"})
        yield WorkflowEvent(event="done", data={"result": data})
    except Exception as exc:  # noqa: BLE001  骨架階段先全捕捉；之後分階段重試
        yield WorkflowEvent(event="error", data={"message": str(exc)})
