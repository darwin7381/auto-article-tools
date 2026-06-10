"""核心引擎測試（不需外部 API）：registry / echo runner / 文件抽取。"""

from __future__ import annotations

from pathlib import Path

import pytest

import app.workflows  # noqa: F401  註冊 workflow
from app.core.registry import WORKFLOWS
from app.services.extract import extract_document
from app.worker.runner import run_workflow


def test_all_workflows_registered():
    for name in ("echo", "extract", "standardize", "article"):
        assert name in WORKFLOWS


@pytest.mark.asyncio
async def test_echo_runner():
    events = [ev async for ev in run_workflow("echo", {"text": "hi joey"})]
    kinds = [e.event for e in events]
    assert kinds[0] == "stage" and kinds[-1] == "done"
    assert events[-1].data["result"]["text"] == "HI JOEY!!!"


@pytest.mark.asyncio
async def test_runner_error_is_captured():
    # 不存在的 workflow → runner 應 yield error 事件而非 raise
    events = [ev async for ev in run_workflow("nope", {})]
    assert events[-1].event == "error"


def test_extract_md(tmp_path: Path):
    f = tmp_path / "a.md"
    f.write_text("# 標題\n\n內容一二三", encoding="utf-8")
    assert "內容一二三" in extract_document(str(f))


def test_extract_rejects_unknown(tmp_path: Path):
    f = tmp_path / "a.xyz"
    f.write_text("x", encoding="utf-8")
    with pytest.raises(ValueError):
        extract_document(str(f))
