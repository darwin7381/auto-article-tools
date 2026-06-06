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
    """一次 workflow 執行。狀態存 DB → durable、可續跑、可被多 worker 拉取。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    workflow: str
    status: JobStatus = Field(default=JobStatus.pending)
    input_json: str = "{}"
    result_json: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


_connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=_connect_args)


def init_db() -> None:
    if settings.database_url.startswith("sqlite:///"):
        path = settings.database_url.replace("sqlite:///", "", 1)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
