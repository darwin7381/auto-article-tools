from __future__ import annotations

from typing import Any, AsyncIterator

from app.core.events import WorkflowEvent
from app.core.registry import get_workflow
from app.core.serialize import json_safe
from app.core.stage import RunContext


def stage_index(name: str, stage_id: str | None) -> int:
    """stage id → 在 workflow 中的索引；None/找不到 → 0（從頭跑）。"""
    if not stage_id:
        return 0
    wf = get_workflow(name)
    for i, s in enumerate(wf.stages):
        if s.id == stage_id:
            return i
    return 0


async def run_workflow(
    name: str,
    input_data: Any,
    ctx: RunContext | None = None,
    start_stage: str | None = None,
) -> AsyncIterator[WorkflowEvent]:
    """跑一條 workflow，逐階段 yield 進度事件（含該階段輸出，供前端檢視/重跑）。

    這是「單一編排入口」—— API(SSE)、CLI、排程都共用這個，流程邏輯只有一份。
    start_stage：從這個階段開始跑（重跑中間步驟用）；input_data 即該階段的輸入態。
    """
    import time

    from app.services.llm import usage_var

    ctx = ctx or RunContext()
    data = input_data
    try:
        wf = get_workflow(name)
        start = stage_index(name, start_stage)
        for stage in wf.stages[start:]:
            yield WorkflowEvent(event="stage", data={"id": stage.id, "status": "running"})
            t0 = time.monotonic()
            usage_var.set([])  # 收集本階段 token 用量
            data = await stage.run(data, ctx)
            usages = usage_var.get() or []
            tokens = sum(u.get("total_tokens", 0) for u in usages)
            yield WorkflowEvent(
                event="stage",
                data={
                    "id": stage.id,
                    "status": "done",
                    "elapsed_ms": int((time.monotonic() - t0) * 1000),
                    "tokens": tokens,
                    "output": json_safe(data),
                },
            )
        yield WorkflowEvent(event="done", data={"result": json_safe(data)})
    except Exception as exc:  # noqa: BLE001  骨架階段先全捕捉；之後分階段重試
        # 帶上例外類型：KeyError('file') 之類的裸值對使用者毫無意義
        yield WorkflowEvent(event="error", data={"message": f"{type(exc).__name__}: {exc}"})
