from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable


@dataclass
class RunContext:
    """跑一條 workflow 期間共享的上下文。之後在這裡放 storage / provider / job_id 等。"""

    job_id: int | None = None
    state: dict[str, Any] = field(default_factory=dict)


# 一個 stage：吃「上一階段輸出 + ctx」，回傳「這一階段輸出」。
StageFn = Callable[[Any, RunContext], Awaitable[Any]]


@dataclass
class Stage:
    """workflow 的一個階段。id 用於進度事件，run 是 async 純函式（可獨立測試）。"""

    id: str
    run: StageFn
