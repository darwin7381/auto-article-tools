"""把 stage 輸出轉成 JSON-safe 結構（給前端逐階段檢視 / 重跑用）。

保留完整文字內容（markdown/html）讓「從某階段重跑」能拿到真實中間態；
過長欄位給個長度提示，bytes / 不可序列化的東西轉成字串。
"""

from __future__ import annotations

from typing import Any

_MAX = 200_000  # 單一字串上限（避免極端值塞爆事件），夠裝整篇稿


def json_safe(obj: Any, _depth: int = 0) -> Any:
    if obj is None or isinstance(obj, (bool, int, float)):
        return obj
    if isinstance(obj, str):
        return obj if len(obj) <= _MAX else obj[:_MAX] + f"…(+{len(obj) - _MAX} chars)"
    if isinstance(obj, bytes):
        return f"<{len(obj)} bytes>"
    if isinstance(obj, dict):
        if _depth > 6:
            return "<...>"
        return {str(k): json_safe(v, _depth + 1) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        if _depth > 6:
            return "<...>"
        return [json_safe(v, _depth + 1) for v in obj]
    return str(obj)
