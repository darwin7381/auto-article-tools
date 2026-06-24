"""部門看板的業務邏輯 —— seed、序列化、卡片/欄位 CRUD、觸發 pipeline、job 狀態自動移欄。

設計重點:
- 文章自動化只是 Task 能觸發的一種 workflow;run_task_pipeline 把卡片欄位轉成 job 輸入。
- job 狀態變更(running/done/error)由 jobrunner 呼叫 sync_task_for_job 自動把卡移到對應欄,
  人也能手動拖 → 同一個 column 欄位、同一條 activity log,雙向都記。
- 即時:所有變更 publish 到 board_bus(看板 SSE),多人同時看得到彼此操作。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.eventbus import board_bus
from app.models import (
    Board,
    Column,
    ColumnKind,
    Job,
    JobStatus,
    Task,
    TaskActivity,
    TaskComment,
    TaskType,
    get_session,
)

# 預設部門板:七欄,kind 帶狀態語意(job 自動移欄靠 kind,不靠名字)。
DEFAULT_BOARD_NAME = "BD 內容部"
DEFAULT_COLUMNS: list[tuple[str, ColumnKind]] = [
    ("提案 Backlog", ColumnKind.backlog),
    ("待處理", ColumnKind.ready),
    ("AI 處理中", ColumnKind.processing),
    ("待審稿", ColumnKind.review),
    ("待發布", ColumnKind.publish),
    ("已發布", ColumnKind.done),
    ("封存", ColumnKind.archive),
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────── seed / 取板 ────────────────────────────

def seed_default_board() -> int:
    """沒有任何板時建立預設部門板 + 欄位。回傳 board_id。冪等。"""
    with get_session() as s:
        existing = s.exec(select(Board).order_by(Board.id)).first()  # type: ignore[attr-defined]
        if existing is not None:
            return existing.id
        board = Board(name=DEFAULT_BOARD_NAME)
        s.add(board)
        s.commit()
        s.refresh(board)
        for i, (name, kind) in enumerate(DEFAULT_COLUMNS):
            s.add(Column(board_id=board.id, name=name, kind=kind, position=float(i)))
        s.commit()
        return board.id


def get_default_board_id() -> int:
    with get_session() as s:
        b = s.exec(select(Board).order_by(Board.id)).first()  # type: ignore[attr-defined]
        if b is not None:
            return b.id
    return seed_default_board()


# ──────────────────────────── 序列化 ────────────────────────────

def _job_progress(s: Session, job_id: int | None) -> dict | None:
    """從 job.events 萃取極小進度摘要,讓看板卡片初載即可畫進度條(免等 SSE)。"""
    if job_id is None:
        return None
    job = s.get(Job, job_id)
    if job is None:
        return None
    events = json.loads(job.events_json or "[]")
    done: list[str] = []
    running: str | None = None
    for ev in events:
        d = ev.get("data", {})
        if ev.get("event") != "stage":
            continue
        if d.get("status") == "done" and d.get("id"):
            done.append(d["id"])
        elif d.get("status") == "running" and d.get("id"):
            running = d["id"]
    status = job.status.value if isinstance(job.status, JobStatus) else job.status
    return {
        "job_id": job_id,
        "status": status,
        "done_stages": done,
        "current_stage": running if running not in done else None,
        "error": job.error,
    }


def task_dict(s: Session, task: Task) -> dict:
    return {
        "id": task.id,
        "board_id": task.board_id,
        "column_id": task.column_id,
        "position": task.position,
        "title": task.title,
        "type": task.type.value if isinstance(task.type, TaskType) else task.type,
        "description": task.description,
        "assignee": task.assignee,
        "creator": task.creator,
        "priority": task.priority.value if hasattr(task.priority, "value") else task.priority,
        "due_date": task.due_date,
        "source_url": task.source_url,
        "source_file": task.source_file,
        "article_type": task.article_type,
        "supplier": task.supplier,
        "header_disclaimer": task.header_disclaimer,
        "footer_disclaimer": task.footer_disclaimer,
        "job_id": task.job_id,
        "job": _job_progress(s, task.job_id),
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def _comment_dict(c: TaskComment) -> dict:
    return {"id": c.id, "task_id": c.task_id, "author": c.author, "body": c.body, "created_at": c.created_at}


def _activity_dict(a: TaskActivity) -> dict:
    return {"id": a.id, "task_id": a.task_id, "actor": a.actor, "kind": a.kind, "detail": a.detail, "created_at": a.created_at}


def board_snapshot(board_id: int) -> dict:
    """整板快照:欄位 + 全部卡片(含每張卡的 job 進度摘要)。前端一次載入。"""
    with get_session() as s:
        board = s.get(Board, board_id)
        if board is None:
            raise ValueError(f"找不到看板: {board_id}")
        cols = s.exec(
            select(Column).where(Column.board_id == board_id).order_by(Column.position)  # type: ignore[attr-defined]
        ).all()
        tasks = s.exec(
            select(Task).where(Task.board_id == board_id).order_by(Task.position)  # type: ignore[attr-defined]
        ).all()
        return {
            "id": board.id,
            "name": board.name,
            "columns": [
                {"id": c.id, "name": c.name, "kind": c.kind.value if isinstance(c.kind, ColumnKind) else c.kind,
                 "position": c.position, "wip_limit": c.wip_limit}
                for c in cols
            ],
            "tasks": [task_dict(s, t) for t in tasks],
        }


# ──────────────────────────── 內部工具 ────────────────────────────

def _emit(board_id: int, event: str, data: dict) -> None:
    board_bus.publish(board_id, {"event": event, "data": data})


def _log(s: Session, task_id: int, actor: str, kind: str, detail: str) -> None:
    s.add(TaskActivity(task_id=task_id, actor=actor or "system", kind=kind, detail=detail))


def _bottom_position(s: Session, column_id: int) -> float:
    """欄底位置 = 該欄最大 position + 1(新卡預設落欄底)。"""
    rows = s.exec(
        select(Task.position).where(Task.column_id == column_id).order_by(Task.position.desc()).limit(1)  # type: ignore[attr-defined]
    ).first()
    return (rows + 1.0) if rows is not None else 1.0


def _column_by_kind(s: Session, board_id: int, kind: ColumnKind) -> Column | None:
    return s.exec(
        select(Column).where(Column.board_id == board_id, Column.kind == kind).order_by(Column.position)  # type: ignore[attr-defined]
    ).first()


def _col_name(s: Session, column_id: int) -> str:
    c = s.get(Column, column_id)
    return c.name if c else "?"


# ──────────────────────────── 卡片 CRUD ────────────────────────────

def create_task(board_id: int, fields: dict, actor: str = "") -> dict:
    with get_session() as s:
        # 預設落在第一欄(backlog),除非指定 column_id
        column_id = fields.get("column_id")
        if not column_id:
            first = s.exec(
                select(Column).where(Column.board_id == board_id).order_by(Column.position)  # type: ignore[attr-defined]
            ).first()
            if first is None:
                raise ValueError("看板沒有任何欄位")
            column_id = first.id
        task = Task(
            board_id=board_id,
            column_id=column_id,
            position=_bottom_position(s, column_id),
            title=fields.get("title") or "未命名工作",
            type=TaskType(fields.get("type", "general")),
            description=fields.get("description", ""),
            assignee=fields.get("assignee", ""),
            creator=actor or fields.get("creator", ""),
            priority=fields.get("priority", "normal"),
            due_date=fields.get("due_date"),
            source_url=fields.get("source_url", ""),
            source_file=fields.get("source_file", ""),
            article_type=fields.get("article_type", ""),
            supplier=fields.get("supplier", ""),
            header_disclaimer=fields.get("header_disclaimer", ""),
            footer_disclaimer=fields.get("footer_disclaimer", ""),
        )
        s.add(task)
        s.commit()
        s.refresh(task)
        _log(s, task.id, actor, "created", f"建立工作「{task.title}」")
        s.commit()
        d = task_dict(s, task)
    _emit(board_id, "task.created", d)
    return d


_EDITABLE = {
    "title", "description", "assignee", "priority", "due_date", "type",
    "source_url", "source_file", "article_type", "supplier",
    "header_disclaimer", "footer_disclaimer",
}


def update_task(task_id: int, patch: dict, actor: str = "") -> dict:
    """編輯卡片欄位 / 移動(column_id + position)。移動與一般編輯都走這條。"""
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到工作卡: {task_id}")
        moved = False
        if "column_id" in patch and patch["column_id"] and patch["column_id"] != task.column_id:
            from_name = _col_name(s, task.column_id)
            task.column_id = patch["column_id"]
            to_name = _col_name(s, task.column_id)
            task.position = patch.get("position", _bottom_position(s, task.column_id))
            _log(s, task.id, actor, "moved", f"{from_name} → {to_name}")
            moved = True
        elif "position" in patch:
            task.position = patch["position"]
        for k in _EDITABLE:
            if k in patch:
                val = patch[k]
                if k == "type" and val:
                    task.type = TaskType(val)
                elif k == "assignee" and val != task.assignee:
                    task.assignee = val
                    _log(s, task.id, actor, "assigned", f"指派給 {val or '(未指派)'}")
                else:
                    setattr(task, k, val)
        task.updated_at = _now()
        s.add(task)
        if not moved and any(k in patch for k in _EDITABLE) and "assignee" not in patch:
            _log(s, task.id, actor, "edited", "編輯卡片內容")
        s.commit()
        s.refresh(task)
        d = task_dict(s, task)
    _emit(task.board_id, "task.updated", d)
    return d


def delete_task(task_id: int, actor: str = "") -> None:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            return
        board_id = task.board_id
        # 連帶刪留言/活動
        for c in s.exec(select(TaskComment).where(TaskComment.task_id == task_id)).all():  # type: ignore[attr-defined]
            s.delete(c)
        for a in s.exec(select(TaskActivity).where(TaskActivity.task_id == task_id)).all():  # type: ignore[attr-defined]
            s.delete(a)
        s.delete(task)
        s.commit()
    _emit(board_id, "task.deleted", {"id": task_id})


def task_detail(task_id: int) -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到工作卡: {task_id}")
        comments = s.exec(
            select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.id)  # type: ignore[attr-defined]
        ).all()
        acts = s.exec(
            select(TaskActivity).where(TaskActivity.task_id == task_id).order_by(TaskActivity.id.desc())  # type: ignore[attr-defined]
        ).all()
        d = task_dict(s, task)
        d["comments"] = [_comment_dict(c) for c in comments]
        d["activity"] = [_activity_dict(a) for a in acts]
        return d


def add_comment(task_id: int, body: str, author: str = "") -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到工作卡: {task_id}")
        c = TaskComment(task_id=task_id, author=author, body=body)
        s.add(c)
        _log(s, task_id, author, "commented", body[:60])
        s.commit()
        s.refresh(c)
        board_id = task.board_id
        cd = _comment_dict(c)
    _emit(board_id, "comment.added", {"task_id": task_id, "comment": cd})
    return cd


# ──────────────────────────── 欄位 CRUD ────────────────────────────

def create_column(board_id: int, name: str, kind: str = "custom", wip_limit: int | None = None) -> dict:
    with get_session() as s:
        maxpos = s.exec(
            select(Column.position).where(Column.board_id == board_id).order_by(Column.position.desc()).limit(1)  # type: ignore[attr-defined]
        ).first()
        col = Column(board_id=board_id, name=name, kind=ColumnKind(kind),
                     position=(maxpos + 1.0) if maxpos is not None else 0.0, wip_limit=wip_limit)
        s.add(col)
        s.commit()
        s.refresh(col)
        d = {"id": col.id, "name": col.name, "kind": col.kind.value, "position": col.position, "wip_limit": col.wip_limit}
    _emit(board_id, "column.changed", {})
    return d


def update_column(column_id: int, patch: dict) -> dict:
    with get_session() as s:
        col = s.get(Column, column_id)
        if col is None:
            raise ValueError(f"找不到欄位: {column_id}")
        if "name" in patch:
            col.name = patch["name"]
        if "position" in patch:
            col.position = patch["position"]
        if "wip_limit" in patch:
            col.wip_limit = patch["wip_limit"]
        if "kind" in patch and patch["kind"]:
            col.kind = ColumnKind(patch["kind"])
        s.add(col)
        s.commit()
        s.refresh(col)
        board_id = col.board_id
        d = {"id": col.id, "name": col.name, "kind": col.kind.value, "position": col.position, "wip_limit": col.wip_limit}
    _emit(board_id, "column.changed", {})
    return d


def delete_column(column_id: int) -> None:
    """刪欄:把欄內卡片移到同板第一欄(避免孤兒卡)。"""
    with get_session() as s:
        col = s.get(Column, column_id)
        if col is None:
            return
        board_id = col.board_id
        fallback = s.exec(
            select(Column).where(Column.board_id == board_id, Column.id != column_id).order_by(Column.position)  # type: ignore[attr-defined]
        ).first()
        if fallback is not None:
            for t in s.exec(select(Task).where(Task.column_id == column_id)).all():  # type: ignore[attr-defined]
                t.column_id = fallback.id
                s.add(t)
        s.delete(col)
        s.commit()
    _emit(board_id, "column.changed", {})


# ──────────────────────── 觸發 pipeline + 狀態同步 ────────────────────────

def _build_article_input(task: Task) -> dict:
    inp: dict = {
        "article_type": task.article_type or "regular",
        "header_disclaimer": task.header_disclaimer or "none",
        "footer_disclaimer": task.footer_disclaimer or "none",
        "supplier": task.supplier or "",
        "formatting": {"headings": True, "intro_quote": True, "dropcap": True, "related": True},
        "force_cover": False,
    }
    if task.source_file:
        inp["file"] = task.source_file
    elif task.source_url:
        inp["url"] = task.source_url
    return inp


def run_task_pipeline(task_id: int, actor: str = "") -> dict:
    """從卡片觸發文章自動化:建 job、link、把卡移到「AI 處理中」欄。"""
    from app.worker.jobrunner import enqueue_job  # 延遲匯入避免循環

    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到工作卡: {task_id}")
        if not task.source_file and not task.source_url:
            raise ValueError("這張卡沒有進稿來源(檔案或連結),無法跑 AI 流程")
        board_id = task.board_id
        inp = _build_article_input(task)

    job_id = enqueue_job("article", inp)

    with get_session() as s:
        task = s.get(Task, task_id)
        task.job_id = job_id
        task.type = TaskType.article
        proc = _column_by_kind(s, board_id, ColumnKind.processing)
        if proc is not None and task.column_id != proc.id:
            from_name = _col_name(s, task.column_id)
            task.column_id = proc.id
            task.position = _bottom_position(s, proc.id)
            _log(s, task_id, actor, "moved", f"{from_name} → {proc.name}")
        task.updated_at = _now()
        s.add(task)
        s.add(Job_link := s.get(Job, job_id))  # 反向關聯
        if Job_link is not None:
            Job_link.task_id = task_id
            s.add(Job_link)
        _log(s, task_id, actor, "job_started", f"觸發 AI 流程(job #{job_id})")
        s.commit()
        s.refresh(task)
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
    return d


def sync_task_for_job(job_id: int) -> None:
    """jobrunner 在 job 狀態變更時呼叫:把掛這個 job 的卡自動移到對應欄。

    running → AI 處理中;done → 待審稿(人在迴路);error → 留在處理中(卡片由 job 連結顯示錯誤)。
    """
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None or job.task_id is None:
            return
        task = s.get(Task, job.task_id)
        if task is None:
            return
        status = job.status.value if isinstance(job.status, JobStatus) else job.status
        board_id = task.board_id
        target_kind = {
            "running": ColumnKind.processing,
            "done": ColumnKind.review,
        }.get(status)
        if target_kind is not None:
            col = _column_by_kind(s, board_id, target_kind)
            if col is not None and task.column_id != col.id:
                from_name = _col_name(s, task.column_id)
                task.column_id = col.id
                task.position = _bottom_position(s, col.id)
                _log(s, task.id, "system", "moved", f"{from_name} → {col.name}(自動)")
                task.updated_at = _now()
                s.add(task)
        if status == "done":
            _log(s, task.id, "system", "job_done", f"AI 流程完成(job #{job_id}),待審稿")
        elif status == "error":
            _log(s, task.id, "system", "job_error", f"AI 流程失敗:{(job.error or '')[:80]}")
        s.commit()
        s.refresh(task)
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
