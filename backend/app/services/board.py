"""Delivery 業務線看板邏輯 —— seed、序列化、稿件/欄位/合約 CRUD、額度、通知雙線、
觸發 bd-pr 轉稿、job 狀態自動移欄。對照 docs/DELIVERY-BOARD.md。

設計重點:
- 文章自動化(bd-pr)只是 Pipeline A 的「AI 轉稿」一步;軟文人寫、Banner 上架。
- job 狀態變更由 jobrunner 呼叫 sync_task_for_job 自動移欄(running→製作中、done→待發佈),
  到「待發佈」自動通知編輯(Slack 等價);人也能手動拖,雙向都記 activity。
- 合約=額度容器;稿件結案(done)即計入該品項已用額度,剩餘 = 約定 − 已用。
- 即時:所有變更 publish 到 board_bus(看板 SSE),多視圖多人同步。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.eventbus import board_bus
from app.models import (
    ITEM_TYPES,
    QUOTA_CATEGORIES,
    Board,
    Column,
    ColumnKind,
    Contract,
    Job,
    JobStatus,
    Notification,
    Task,
    TaskActivity,
    TaskComment,
    TaskType,
    get_session,
)

DEFAULT_BOARD_NAME = "Delivery 業務稿處理"
# 跨三條 pipeline 的統一階段(見 docs/DELIVERY-BOARD.md §3)。
DEFAULT_COLUMNS: list[tuple[str, ColumnKind]] = [
    ("需求進線", ColumnKind.backlog),
    ("待審 / 確認額度", ColumnKind.ready),
    ("製作中 / AI 轉稿", ColumnKind.processing),
    ("客戶確認", ColumnKind.client_review),
    ("待發佈 / 排程", ColumnKind.publish),
    ("社群推播", ColumnKind.distribution),
    ("已結案", ColumnKind.done),
    ("封存", ColumnKind.archive),
]

# 品項 → bd-pr 進稿參數(押註/文稿類型)。
_ITEM_ARTICLE_PARAMS = {
    "廣編稿": {"article_type": "sponsored", "header_disclaimer": "sponsored", "footer_disclaimer": "sponsored"},
    "官網快訊": {"article_type": "regular", "header_disclaimer": "none", "footer_disclaimer": "none"},
    "新聞稿": {"article_type": "press-release", "header_disclaimer": "press-release", "footer_disclaimer": "none"},
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────────────────── seed / 取板 ────────────────────────────

def seed_default_board() -> int:
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


def reset_default_board() -> int:
    """把預設板重建成 Delivery 設計(清掉舊欄位/卡片/合約)。僅供開發期重置用。"""
    with get_session() as s:
        for model in (TaskActivity, TaskComment, Notification, Task, Column, Contract, Board):
            for row in s.exec(select(model)).all():
                s.delete(row)
        s.commit()
    return seed_default_board()


def migrate_board() -> None:
    """一次性遷移:把舊版看板(內容部 7 欄,含已移除的 ColumnKind 'review')升級成 Delivery 設計。

    為何需要:舊欄位的 kind 值已不在現行 enum → ORM 一載入就 LookupError 崩潰,且 seed 對
    既有板是 no-op(不會自己換成新設計)。這裡用 raw SQL 偵測(避開 enum 載入),偵測到舊版就
    把欄位重建為 Delivery 八階段、既有卡片移到「需求進線」保留不刪、看板改名。
    冪等:遷移後欄位全為合法 Delivery kind,不再觸發。"""
    from sqlalchemy import text

    from app.models import engine

    valid = {k.value for k in ColumnKind}
    with engine.begin() as conn:
        try:
            cols = conn.execute(text('SELECT id, board_id, kind FROM "column"')).fetchall()
        except Exception:  # noqa: BLE001  表還沒建(全新 DB)→ 交給 seed
            return
        bad_boards = {bid for (_cid, bid, kind) in cols if kind not in valid}
        if not bad_boards:
            return
        now = _now()
        for bid in bad_boards:
            old_ids = [cid for (cid, b, _k) in cols if b == bid]
            new_backlog = None
            for i, (name, kind) in enumerate(DEFAULT_COLUMNS):
                res = conn.execute(
                    text('INSERT INTO "column" (board_id, name, kind, position, created_at) '
                         'VALUES (:b, :n, :k, :p, :t)'),
                    {"b": bid, "n": name, "k": kind.value, "p": float(i), "t": now},
                )
                if i == 0:
                    new_backlog = res.lastrowid
            if old_ids:
                conn.execute(text("UPDATE task SET column_id = :bk WHERE board_id = :b"), {"bk": new_backlog, "b": bid})
                conn.execute(text('DELETE FROM "column" WHERE id IN (%s)' % ",".join(str(i) for i in old_ids)))
            conn.execute(text("UPDATE board SET name = :n WHERE id = :b"), {"n": DEFAULT_BOARD_NAME, "b": bid})


def get_default_board_id() -> int:
    with get_session() as s:
        b = s.exec(select(Board).order_by(Board.id)).first()  # type: ignore[attr-defined]
        if b is not None:
            return b.id
    return seed_default_board()


# ──────────────────────────── 額度 ────────────────────────────

def _quota(contract: Contract) -> dict:
    try:
        return json.loads(contract.quota_json or "{}")
    except (ValueError, TypeError):
        return {}


def contract_usage(s: Session, contract_id: int) -> dict:
    """各品項 {total, used, remaining}。used = 已結案(done 欄)的可計費稿件數。"""
    contract = s.get(Contract, contract_id)
    if contract is None:
        return {}
    quota = _quota(contract)
    done_col_ids = {c.id for c in s.exec(
        select(Column).where(Column.kind == ColumnKind.done)  # type: ignore[attr-defined]
    ).all()}
    tasks = s.exec(select(Task).where(Task.contract_id == contract_id)).all()  # type: ignore[attr-defined]
    used: dict[str, int] = {cat: 0 for cat in QUOTA_CATEGORIES}
    for t in tasks:
        meta = ITEM_TYPES.get(t.item_type or "", {})
        cat = meta.get("quota")
        if cat and meta.get("billable") and t.column_id in done_col_ids:
            used[cat] = used.get(cat, 0) + 1
    out: dict[str, dict] = {}
    for cat in QUOTA_CATEGORIES:
        total = int(quota.get(cat, 0) or 0)
        u = used.get(cat, 0)
        if total or u:
            out[cat] = {"total": total, "used": u, "remaining": total - u}
    return out


def _contract_dict(s: Session, c: Contract) -> dict:
    return {
        "id": c.id, "client": c.client, "name": c.name, "mode": c.mode,
        "quota": _quota(c), "usage": contract_usage(s, c.id),
        "channels": c.channels, "notes": c.notes,
        "start_date": c.start_date, "end_date": c.end_date, "created_at": c.created_at,
    }


# ──────────────────────────── 序列化 ────────────────────────────

def _job_progress(s: Session, job_id: int | None) -> dict | None:
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
    return {"job_id": job_id, "status": status, "done_stages": done,
            "current_stage": running if running not in done else None, "error": job.error}


def _pipeline_of(task: Task) -> str:
    if task.pipeline:
        return task.pipeline
    return ITEM_TYPES.get(task.item_type or "", {}).get("pipeline", "")


def task_dict(s: Session, task: Task) -> dict:
    try:
        urls = json.loads(task.published_urls or "{}")
    except (ValueError, TypeError):
        urls = {}
    contract_brief = None
    if task.contract_id:
        c = s.get(Contract, task.contract_id)
        if c is not None:
            cat = ITEM_TYPES.get(task.item_type or "", {}).get("quota")
            usage = contract_usage(s, c.id)
            contract_brief = {"id": c.id, "client": c.client, "name": c.name,
                              "category": cat, "category_usage": usage.get(cat) if cat else None}
    return {
        "id": task.id, "board_id": task.board_id, "column_id": task.column_id, "position": task.position,
        "title": task.title,
        "type": task.type.value if isinstance(task.type, TaskType) else task.type,
        "description": task.description,
        "priority": task.priority.value if hasattr(task.priority, "value") else task.priority,
        "client": task.client, "pipeline": _pipeline_of(task), "item_type": task.item_type,
        "bd_owner": task.bd_owner, "dm_owner": task.dm_owner, "editor": task.editor,
        "contract_id": task.contract_id, "contract": contract_brief,
        "channels": [x for x in (task.channels or "").split(",") if x],
        "notes": task.notes,
        "draft_deadline": task.draft_deadline, "publish_deadline": task.publish_deadline,
        "published_urls": urls,
        "assignee": task.assignee, "creator": task.creator, "due_date": task.due_date,
        "source_url": task.source_url, "source_file": task.source_file,
        "article_type": task.article_type, "supplier": task.supplier,
        "header_disclaimer": task.header_disclaimer, "footer_disclaimer": task.footer_disclaimer,
        "job_id": task.job_id, "job": _job_progress(s, task.job_id),
        "created_at": task.created_at, "updated_at": task.updated_at,
    }


def _comment_dict(c: TaskComment) -> dict:
    return {"id": c.id, "task_id": c.task_id, "author": c.author, "body": c.body, "created_at": c.created_at}


def _activity_dict(a: TaskActivity) -> dict:
    return {"id": a.id, "task_id": a.task_id, "actor": a.actor, "kind": a.kind, "detail": a.detail, "created_at": a.created_at}


def _notif_dict(n: Notification) -> dict:
    return {"id": n.id, "task_id": n.task_id, "channel": n.channel, "target": n.target, "body": n.body, "created_at": n.created_at}


def board_snapshot(board_id: int) -> dict:
    with get_session() as s:
        board = s.get(Board, board_id)
        if board is None:
            raise ValueError(f"找不到看板: {board_id}")
        cols = s.exec(select(Column).where(Column.board_id == board_id).order_by(Column.position)).all()  # type: ignore[attr-defined]
        tasks = s.exec(select(Task).where(Task.board_id == board_id).order_by(Task.position)).all()  # type: ignore[attr-defined]
        contracts = s.exec(select(Contract).order_by(Contract.id.desc())).all()  # type: ignore[attr-defined]
        return {
            "id": board.id, "name": board.name,
            "columns": [{"id": c.id, "name": c.name,
                         "kind": c.kind.value if isinstance(c.kind, ColumnKind) else c.kind,
                         "position": c.position, "wip_limit": c.wip_limit} for c in cols],
            "tasks": [task_dict(s, t) for t in tasks],
            "contracts": [_contract_dict(s, c) for c in contracts],
            "meta": {"item_types": ITEM_TYPES, "quota_categories": QUOTA_CATEGORIES,
                     "roles": {"bd": ["Alex", "Jessica"], "dm": ["Meg", "Kessy"], "editor": ["Joe", "Luci", "胖丁"]}},
        }


# ──────────────────────────── 內部工具 ────────────────────────────

def _emit(board_id: int, event: str, data: dict) -> None:
    board_bus.publish(board_id, {"event": event, "data": data})


def _log(s: Session, task_id: int, actor: str, kind: str, detail: str) -> None:
    s.add(TaskActivity(task_id=task_id, actor=actor or "system", kind=kind, detail=detail))


def _bottom_position(s: Session, column_id: int) -> float:
    row = s.exec(select(Task.position).where(Task.column_id == column_id).order_by(Task.position.desc()).limit(1)).first()  # type: ignore[attr-defined]
    return (row + 1.0) if row is not None else 1.0


def _column_by_kind(s: Session, board_id: int, kind: ColumnKind) -> Column | None:
    return s.exec(select(Column).where(Column.board_id == board_id, Column.kind == kind).order_by(Column.position)).first()  # type: ignore[attr-defined]


def _col(s: Session, column_id: int) -> Column | None:
    return s.get(Column, column_id)


def _col_name(s: Session, column_id: int) -> str:
    c = s.get(Column, column_id)
    return c.name if c else "?"


def _apply_item_type(task: Task, item_type: str) -> None:
    """設品項 → 自動帶 pipeline / type / bd-pr 押註參數。"""
    task.item_type = item_type
    meta = ITEM_TYPES.get(item_type, {})
    task.pipeline = meta.get("pipeline", "")
    task.type = TaskType.article if meta.get("pipeline") == "A" else TaskType.general
    params = _ITEM_ARTICLE_PARAMS.get(item_type)
    if params:
        task.article_type = task.article_type or params["article_type"]
        task.header_disclaimer = task.header_disclaimer or params["header_disclaimer"]
        task.footer_disclaimer = task.footer_disclaimer or params["footer_disclaimer"]


# ──────────────────────────── 通知雙線 ────────────────────────────

def _notify(s: Session, task: Task, channel: str, target: str, body: str) -> None:
    """寫通知 log + activity(取代 Slack/TG)。接口可日後接真 channel。"""
    s.add(Notification(task_id=task.id, channel=channel, target=target, body=body))
    _log(s, task.id, "system", "notified", f"通知{'編輯' if channel == 'editor' else 'BD'} {target}:{body[:40]}")


def notify_bd(task_id: int, actor: str = "") -> dict:
    """手動觸發:通知 BD 回傳客戶(TG 等價)。"""
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
        urls = json.loads(task.published_urls or "{}")
        links = "、".join(f"{k}:{v}" for k, v in urls.items() if v) or "(連結待補)"
        body = f"【{task.client or task.title}】已發佈,請回傳客戶 — {links}"
        _notify(s, task, "bd", task.bd_owner or "BD", body)
        s.commit()
        board_id = task.board_id
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
    return d


# ──────────────────────────── 稿件 CRUD ────────────────────────────

_EDITABLE = {
    "title", "description", "priority", "type",
    "client", "item_type", "bd_owner", "dm_owner", "editor", "contract_id",
    "channels", "notes", "draft_deadline", "publish_deadline",
    "assignee", "due_date",
    "source_url", "source_file", "article_type", "supplier",
    "header_disclaimer", "footer_disclaimer",
}


def create_task(board_id: int, fields: dict, actor: str = "") -> dict:
    with get_session() as s:
        column_id = fields.get("column_id")
        if not column_id:
            first = s.exec(select(Column).where(Column.board_id == board_id).order_by(Column.position)).first()  # type: ignore[attr-defined]
            if first is None:
                raise ValueError("看板沒有任何欄位")
            column_id = first.id
        task = Task(
            board_id=board_id, column_id=column_id, position=_bottom_position(s, column_id),
            title=fields.get("title") or "未命名稿件",
            description=fields.get("description", ""),
            priority=fields.get("priority", "normal"),
            client=fields.get("client", ""),
            bd_owner=fields.get("bd_owner", ""), dm_owner=fields.get("dm_owner", ""), editor=fields.get("editor", ""),
            contract_id=fields.get("contract_id"),
            channels=fields.get("channels", ""), notes=fields.get("notes", ""),
            draft_deadline=fields.get("draft_deadline"), publish_deadline=fields.get("publish_deadline"),
            assignee=fields.get("assignee", ""), creator=actor or fields.get("creator", ""),
            due_date=fields.get("due_date"),
            source_url=fields.get("source_url", ""), source_file=fields.get("source_file", ""),
            supplier=fields.get("supplier", ""),
        )
        if fields.get("item_type"):
            _apply_item_type(task, fields["item_type"])
        elif fields.get("type"):
            task.type = TaskType(fields["type"])
        # 明確帶入的押註參數覆蓋自動值
        for k in ("article_type", "header_disclaimer", "footer_disclaimer"):
            if fields.get(k):
                setattr(task, k, fields[k])
        s.add(task)
        s.commit()
        s.refresh(task)
        _log(s, task.id, actor, "created", f"建立稿件「{task.title}」{f'（{task.item_type}）' if task.item_type else ''}")
        s.commit()
        d = task_dict(s, task)
    _emit(board_id, "task.created", d)
    return d


def update_task(task_id: int, patch: dict, actor: str = "") -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
        moved_to_done = False
        if "column_id" in patch and patch["column_id"] and patch["column_id"] != task.column_id:
            from_name = _col_name(s, task.column_id)
            new_col = _col(s, patch["column_id"])
            task.column_id = patch["column_id"]
            task.position = patch.get("position", _bottom_position(s, task.column_id))
            _log(s, task.id, actor, "moved", f"{from_name} → {new_col.name if new_col else '?'}")
            if new_col is not None and new_col.kind == ColumnKind.done:
                moved_to_done = True
        elif "position" in patch:
            task.position = patch["position"]
        for k in _EDITABLE:
            if k not in patch:
                continue
            val = patch[k]
            if k == "item_type" and val:
                _apply_item_type(task, val)
            elif k == "type" and val:
                task.type = TaskType(val)
            elif k == "assignee" and val != task.assignee:
                task.assignee = val
                _log(s, task.id, actor, "assigned", f"指派給 {val or '(未指派)'}")
            else:
                setattr(task, k, val)
        task.updated_at = _now()
        s.add(task)
        if moved_to_done and task.contract_id and ITEM_TYPES.get(task.item_type or "", {}).get("billable"):
            _log(s, task.id, "system", "billed", f"結案,計入合約額度（{ITEM_TYPES[task.item_type]['quota']}）")
        s.commit()
        s.refresh(task)
        board_id = task.board_id
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
    return d


def update_published_urls(task_id: int, urls: dict, actor: str = "") -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
        cur = json.loads(task.published_urls or "{}")
        cur.update({k: v for k, v in urls.items()})
        task.published_urls = json.dumps(cur, ensure_ascii=False)
        task.updated_at = _now()
        s.add(task)
        _log(s, task.id, actor, "edited", "回填發佈連結")
        s.commit()
        s.refresh(task)
        board_id = task.board_id
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
    return d


def delete_task(task_id: int, actor: str = "") -> None:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            return
        board_id = task.board_id
        for model in (TaskComment, TaskActivity, Notification):
            for row in s.exec(select(model).where(model.task_id == task_id)).all():  # type: ignore[attr-defined]
                s.delete(row)
        s.delete(task)
        s.commit()
    _emit(board_id, "task.deleted", {"id": task_id})


def task_detail(task_id: int) -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
        comments = s.exec(select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.id)).all()  # type: ignore[attr-defined]
        acts = s.exec(select(TaskActivity).where(TaskActivity.task_id == task_id).order_by(TaskActivity.id.desc())).all()  # type: ignore[attr-defined]
        notifs = s.exec(select(Notification).where(Notification.task_id == task_id).order_by(Notification.id.desc())).all()  # type: ignore[attr-defined]
        d = task_dict(s, task)
        d["comments"] = [_comment_dict(c) for c in comments]
        d["activity"] = [_activity_dict(a) for a in acts]
        d["notifications"] = [_notif_dict(n) for n in notifs]
        return d


def add_comment(task_id: int, body: str, author: str = "") -> dict:
    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
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
        maxpos = s.exec(select(Column.position).where(Column.board_id == board_id).order_by(Column.position.desc()).limit(1)).first()  # type: ignore[attr-defined]
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
        for k in ("name", "position", "wip_limit"):
            if k in patch:
                setattr(col, k, patch[k])
        if patch.get("kind"):
            col.kind = ColumnKind(patch["kind"])
        s.add(col)
        s.commit()
        s.refresh(col)
        board_id = col.board_id
        d = {"id": col.id, "name": col.name, "kind": col.kind.value, "position": col.position, "wip_limit": col.wip_limit}
    _emit(board_id, "column.changed", {})
    return d


def delete_column(column_id: int) -> None:
    with get_session() as s:
        col = s.get(Column, column_id)
        if col is None:
            return
        board_id = col.board_id
        fallback = s.exec(select(Column).where(Column.board_id == board_id, Column.id != column_id).order_by(Column.position)).first()  # type: ignore[attr-defined]
        if fallback is not None:
            for t in s.exec(select(Task).where(Task.column_id == column_id)).all():  # type: ignore[attr-defined]
                t.column_id = fallback.id
                s.add(t)
        s.delete(col)
        s.commit()
    _emit(board_id, "column.changed", {})


# ──────────────────────────── 合約 CRUD ────────────────────────────

def create_contract(fields: dict) -> dict:
    with get_session() as s:
        c = Contract(
            client=fields.get("client", ""), name=fields.get("name", ""), mode=fields.get("mode", ""),
            quota_json=json.dumps(fields.get("quota", {}), ensure_ascii=False),
            channels=fields.get("channels", ""), notes=fields.get("notes", ""),
            start_date=fields.get("start_date"), end_date=fields.get("end_date"),
        )
        s.add(c)
        s.commit()
        s.refresh(c)
        d = _contract_dict(s, c)
        board_id = get_default_board_id()
    _emit(board_id, "contract.changed", {})
    return d


def update_contract(contract_id: int, patch: dict) -> dict:
    with get_session() as s:
        c = s.get(Contract, contract_id)
        if c is None:
            raise ValueError(f"找不到合約: {contract_id}")
        for k in ("client", "name", "mode", "channels", "notes", "start_date", "end_date"):
            if k in patch:
                setattr(c, k, patch[k])
        if "quota" in patch:
            c.quota_json = json.dumps(patch["quota"], ensure_ascii=False)
        s.add(c)
        s.commit()
        s.refresh(c)
        d = _contract_dict(s, c)
        board_id = get_default_board_id()
    _emit(board_id, "contract.changed", {})
    return d


def delete_contract(contract_id: int) -> None:
    with get_session() as s:
        c = s.get(Contract, contract_id)
        if c is None:
            return
        for t in s.exec(select(Task).where(Task.contract_id == contract_id)).all():  # type: ignore[attr-defined]
            t.contract_id = None
            s.add(t)
        s.delete(c)
        s.commit()
    _emit(get_default_board_id(), "contract.changed", {})


def list_contracts() -> list[dict]:
    with get_session() as s:
        return [_contract_dict(s, c) for c in s.exec(select(Contract).order_by(Contract.id.desc())).all()]  # type: ignore[attr-defined]


# ──────────────────────── 觸發 bd-pr 轉稿 + 狀態同步 ────────────────────────

def _build_article_input(task: Task) -> dict:
    inp: dict = {
        "article_type": task.article_type or "regular",
        "header_disclaimer": task.header_disclaimer or "none",
        "footer_disclaimer": task.footer_disclaimer or "none",
        "supplier": task.supplier or task.client or "",
        "formatting": {"headings": True, "intro_quote": True, "dropcap": True, "related": True},
        "force_cover": False,
    }
    if task.source_file:
        inp["file"] = task.source_file
    elif task.source_url:
        inp["url"] = task.source_url
    return inp


def run_task_pipeline(task_id: int, actor: str = "") -> dict:
    """從稿件卡觸發 bd-pr AI 轉稿:建 job、link、移到「製作中 / AI 轉稿」。"""
    from app.worker.jobrunner import enqueue_job

    with get_session() as s:
        task = s.get(Task, task_id)
        if task is None:
            raise ValueError(f"找不到稿件: {task_id}")
        if not task.source_file and not task.source_url:
            raise ValueError("這張卡沒有進稿來源(檔案或連結),無法跑 AI 轉稿")
        board_id = task.board_id
        inp = _build_article_input(task)

    job_id = enqueue_job("article", inp)

    with get_session() as s:
        task = s.get(Task, task_id)
        task.job_id = job_id
        if task.type != TaskType.article:
            task.type = TaskType.article
        proc = _column_by_kind(s, board_id, ColumnKind.processing)
        if proc is not None and task.column_id != proc.id:
            from_name = _col_name(s, task.column_id)
            task.column_id = proc.id
            task.position = _bottom_position(s, proc.id)
            _log(s, task_id, actor, "moved", f"{from_name} → {proc.name}")
        task.updated_at = _now()
        s.add(task)
        job = s.get(Job, job_id)
        if job is not None:
            job.task_id = task_id
            s.add(job)
        _log(s, task_id, actor, "job_started", f"觸發 AI 轉稿(job #{job_id})")
        s.commit()
        s.refresh(task)
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
    return d


def sync_task_for_job(job_id: int) -> None:
    """jobrunner 在 job 狀態變更時呼叫:running → 製作中;done → 待發佈 + 通知編輯審稿。"""
    with get_session() as s:
        job = s.get(Job, job_id)
        if job is None or job.task_id is None:
            return
        task = s.get(Task, job.task_id)
        if task is None:
            return
        status = job.status.value if isinstance(job.status, JobStatus) else job.status
        board_id = task.board_id
        target_kind = {"running": ColumnKind.processing, "done": ColumnKind.publish}.get(status)
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
            _log(s, task.id, "system", "job_done", f"AI 轉稿完成(job #{job_id}),待編輯審稿")
            _notify(s, task, "editor", task.editor or "編輯", f"【{task.client or task.title}】已轉稿完成,請審稿+發布")
        elif status == "error":
            _log(s, task.id, "system", "job_error", f"AI 轉稿失敗:{(job.error or '')[:80]}")
        s.commit()
        s.refresh(task)
        d = task_dict(s, task)
    _emit(board_id, "task.updated", d)
