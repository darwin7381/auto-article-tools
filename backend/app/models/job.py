from __future__ import annotations

import enum
import os
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Session, SQLModel, create_engine

from app.settings import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    awaiting_review = "awaiting_review"  # 人在迴路：等編輯審稿
    done = "done"
    error = "error"


class Job(SQLModel, table=True):
    """一次 workflow 執行。狀態存 DB → durable、可續跑、可被 worker 拉取。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    workflow: str
    status: JobStatus = Field(default=JobStatus.pending)
    input_json: str = "{}"
    result_json: Optional[str] = None
    events_json: str = "[]"  # 逐階段進度事件（供 SSE 斷線重播 / 歷史檢視）
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


_connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=_connect_args)


def _auto_migrate() -> None:
    """加上 metadata 有、但既有表缺的欄位（additive only）。

    SQLModel 的 create_all 不會改既有表；這個輕量遷移避免改 schema 後撞到舊 DB。
    只做「新增欄位」，不刪不改型別（破壞性遷移需另外處理）。
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    for table in SQLModel.metadata.sorted_tables:
        if not insp.has_table(table.name):
            continue
        existing = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in existing:
                continue
            coltype = col.type.compile(dialect=engine.dialect)
            default = ""
            arg = getattr(col.default, "arg", None) if col.default is not None else None
            if arg is not None and not callable(arg):
                default = f" DEFAULT {arg!r}" if isinstance(arg, str) else f" DEFAULT {arg}"
            with engine.begin() as conn:
                conn.execute(
                    text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {coltype}{default}')
                )


def init_db() -> None:
    if settings.database_url.startswith("sqlite:///"):
        path = settings.database_url.replace("sqlite:///", "", 1)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    SQLModel.metadata.create_all(engine)
    _auto_migrate()
    # SQLite 併發：開 WAL，讓多個 worker + 讀取不互相阻塞
    if settings.database_url.startswith("sqlite"):
        with engine.connect() as conn:
            conn.exec_driver_sql("PRAGMA journal_mode=WAL")


def get_session() -> Session:
    return Session(engine)
