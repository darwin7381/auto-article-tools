"""部門工作管理看板的資料模型。

層級:Board(部門板) → Column(欄位/狀態) → Task(工作卡)。
Task 是「部門層級的一個工作」,文章自動化(Job)只是 Task 可掛載的其中一種 workflow:
  - type=article 的卡會掛一個 Job(job_id) → 卡片上直接看即時管線進度
  - type=general 的卡是純人工工作(找 KOL、排社群…),只在看板上被人拖動

刻意不做使用者/權限系統(Joey 指示:先把看板+進度管理做完整,auth 之後再說)。
assignee/creator/author 都是純文字名字,activity log 記名即可,零登入門檻。
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ColumnKind(str, enum.Enum):
    """欄位語意 —— job 狀態自動移欄、以及視覺分組都靠這個,不靠欄位名字(名字可被改)。"""

    backlog = "backlog"        # 提案 / 需求池
    ready = "ready"            # 素材齊全、可進 AI
    processing = "processing"  # AI 處理中(pipeline 跑)
    review = "review"          # 待審稿(人在迴路)
    publish = "publish"        # 待發布
    done = "done"              # 已發布 / 完成
    archive = "archive"        # 封存
    custom = "custom"          # 使用者自訂的純人工欄位


class TaskType(str, enum.Enum):
    article = "article"   # 掛文章自動化 pipeline
    general = "general"   # 純人工工作


class Priority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class Board(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=_utcnow)


class Column(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(index=True, foreign_key="board.id")
    name: str
    kind: ColumnKind = Field(default=ColumnKind.custom)
    position: float = 0.0          # 欄位左右順序
    wip_limit: Optional[int] = None  # 在製品上限(超過 UI 提示),None=不限
    created_at: datetime = Field(default_factory=_utcnow)


class Task(SQLModel, table=True):
    """看板上的一張工作卡。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(index=True, foreign_key="board.id")
    column_id: int = Field(index=True, foreign_key="column.id")
    position: float = 0.0  # 欄內上下順序(分數排名,移動只改自己一筆,免重排整欄)

    title: str
    type: TaskType = Field(default=TaskType.general)
    description: str = ""
    assignee: str = ""   # 負責人(純名字)
    creator: str = ""    # 建立者(純名字)
    priority: Priority = Field(default=Priority.normal)
    due_date: Optional[datetime] = None

    # ── 文章類卡(type=article)觸發 pipeline 所需的進稿參數 ──
    source_url: str = ""
    source_file: str = ""        # data/uploads/... (走上傳端點取得)
    article_type: str = ""       # regular | sponsored | press-release
    supplier: str = ""           # 供稿方(押註替換用)
    header_disclaimer: str = ""  # none | sponsored | press-release
    footer_disclaimer: str = ""

    job_id: Optional[int] = Field(default=None, foreign_key="job.id")  # 掛上的自動化執行

    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class TaskComment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(index=True, foreign_key="task.id")
    author: str = ""
    body: str
    created_at: datetime = Field(default_factory=_utcnow)


class TaskActivity(SQLModel, table=True):
    """卡片時間軸 / 稽核流。人為與自動化的每個狀態推進都記一筆。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(index=True, foreign_key="task.id")
    actor: str = ""           # 誰做的(名字或 'system')
    kind: str = ""            # created | moved | assigned | edited | commented | job_started | job_done | job_error
    detail: str = ""          # 人話描述,例:「待處理 → AI 處理中」
    created_at: datetime = Field(default_factory=_utcnow)
