"""每個 job 的記憶體內 pub/sub —— 讓 SSE 端點即時收到進度事件。

只負責「進行中」的即時推送；歷史/斷線重播由 Job.events_json（DB）負責。
"""

from __future__ import annotations

import asyncio
from typing import Any


class JobEventBus:
    def __init__(self) -> None:
        self._subs: dict[int, set[asyncio.Queue]] = {}

    def subscribe(self, job_id: int) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subs.setdefault(job_id, set()).add(q)
        return q

    def unsubscribe(self, job_id: int, q: asyncio.Queue) -> None:
        subs = self._subs.get(job_id)
        if subs and q in subs:
            subs.discard(q)
            if not subs:
                self._subs.pop(job_id, None)

    def publish(self, job_id: int, event: dict[str, Any]) -> None:
        for q in self._subs.get(job_id, set()):
            q.put_nowait(event)


bus = JobEventBus()
