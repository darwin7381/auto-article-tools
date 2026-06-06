"""CLI 入口 —— 與 API 共用同一個 run_workflow runner。

用法（在 backend/ 下）：
    uv run python cli.py --list
    uv run python cli.py echo --input '{"text": "hello"}'
"""

from __future__ import annotations

import argparse
import asyncio
import json

import app.workflows  # noqa: F401  匯入即註冊所有 workflow
from app.core.registry import WORKFLOWS
from app.worker.runner import run_workflow


async def _run(name: str, input_json: str) -> None:
    async for ev in run_workflow(name, json.loads(input_json)):
        print(f"[{ev.event}] {json.dumps(ev.data, ensure_ascii=False)}")


def main() -> None:
    p = argparse.ArgumentParser(description="跑一條 workflow（與 API 共用同一個 runner）")
    p.add_argument("workflow", nargs="?", help="workflow 名稱")
    p.add_argument("--input", default="{}", help="JSON 輸入")
    p.add_argument("--list", action="store_true", help="列出所有 workflow")
    args = p.parse_args()

    if args.list or not args.workflow:
        print("可用 workflow:", ", ".join(WORKFLOWS.keys()) or "(無)")
        return
    asyncio.run(_run(args.workflow, args.input))


if __name__ == "__main__":
    main()
