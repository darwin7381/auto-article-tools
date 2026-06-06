from __future__ import annotations

from dataclasses import dataclass, field

from .stage import Stage


@dataclass
class Workflow:
    """一條稿件處理工作流 = 一串宣告式的 stage。加新流程 = 在 workflows/ 加一個定義並 register()。"""

    name: str
    stages: list[Stage] = field(default_factory=list)
    description: str = ""


WORKFLOWS: dict[str, Workflow] = {}


def register(workflow: Workflow) -> Workflow:
    if workflow.name in WORKFLOWS:
        raise ValueError(f"workflow 已註冊: {workflow.name}")
    WORKFLOWS[workflow.name] = workflow
    return workflow


def get_workflow(name: str) -> Workflow:
    if name not in WORKFLOWS:
        raise KeyError(f"找不到 workflow: {name}")
    return WORKFLOWS[name]
