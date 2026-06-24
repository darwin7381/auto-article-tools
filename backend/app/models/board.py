"""Delivery 跨部門業務線看板的資料模型。

取代 Notion 兩張進度表 + Google Sheet 合約額度,把整條 Delivery(業務稿處理)搬進平台:
合約 → 審稿 → 轉稿(bd-pr) → 上稿 → 社群推播 → 回傳客戶 → 扣額度。
設計依據:auto-bd-sys-v1/Delivery_操作手冊,對照見 docs/DELIVERY-BOARD.md。

層級:Board(業務線板) → Column(階段) → Task(稿件/工作卡)。Contract(合約)是額度容器。
刻意不做 auth/權限(Joey 指示先把功能做完整);角色/負責人都是純文字名字。
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# 合約額度的 6 類品項(對 Cal-合約額度 6 欄);新聞稿不在此(不扣額度)。
QUOTA_CATEGORIES = ["廣編", "官網快訊", "常規", "專訪", "深度", "Banner"]

# 品項 → 所屬 pipeline / 額度類別 / 是否扣額度。
ITEM_TYPES: dict[str, dict] = {
    "廣編稿": {"pipeline": "A", "quota": "廣編", "billable": True},
    "官網快訊": {"pipeline": "A", "quota": "官網快訊", "billable": True},
    "新聞稿": {"pipeline": "A", "quota": "", "billable": False},  # 人情置換,不扣
    "常規": {"pipeline": "B", "quota": "常規", "billable": True},
    "專訪": {"pipeline": "B", "quota": "專訪", "billable": True},
    "深度": {"pipeline": "B", "quota": "深度", "billable": True},
    "Banner": {"pipeline": "C", "quota": "Banner", "billable": True},
}


class ColumnKind(str, enum.Enum):
    """階段語意 —— job 自動移欄、視覺分組靠 kind(名字可被改)。"""

    backlog = "backlog"              # 需求進線
    ready = "ready"                  # 待審 / 確認額度
    processing = "processing"        # 製作中 / AI 轉稿
    client_review = "client_review"  # 客戶確認(過稿)
    publish = "publish"              # 待發佈 / 排程
    distribution = "distribution"    # 社群推播
    done = "done"                    # 已結案
    archive = "archive"              # 封存
    custom = "custom"                # 自訂


class TaskType(str, enum.Enum):
    article = "article"   # 走 bd-pr AI 轉稿(Pipeline A)
    general = "general"   # 軟文撰稿 / Banner / 純人工


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
    position: float = 0.0
    wip_limit: Optional[int] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Contract(SQLModel, table=True):
    """合約 = N 篇稿件的額度容器(取代 Google Sheet Entry-合約 + Cal-合約額度)。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    client: str = ""           # 客戶
    name: str = ""             # 合約名 / 案名
    mode: str = ""             # 單篇 / 半年約 / X 個月 / 年約 / Global Media / Agency 月結
    quota_json: str = "{}"     # 各品項約定額度 {"廣編": 10, "專訪": 2, ...}
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    channels: str = ""         # 合約對應發布渠道(csv)
    notes: str = ""
    created_at: datetime = Field(default_factory=_utcnow)


class Task(SQLModel, table=True):
    """看板上的一張稿件 / 工作卡(Delivery item)。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(index=True, foreign_key="board.id")
    column_id: int = Field(index=True, foreign_key="column.id")
    position: float = 0.0

    title: str
    type: TaskType = Field(default=TaskType.general)
    description: str = ""
    priority: Priority = Field(default=Priority.normal)

    # ── Delivery 業務欄位 ──
    client: str = ""                 # 客戶
    pipeline: str = ""               # A | B | C(可由 item_type 推導,存起來方便 group/filter)
    item_type: str = ""              # 廣編稿 / 官網快訊 / 新聞稿 / 常規 / 專訪 / 深度 / Banner
    bd_owner: str = ""               # BD(Alex / Jessica)
    dm_owner: str = ""               # DM(Meg / Kessy)
    editor: str = ""                 # 主審(Joe / Luci / 胖丁)
    contract_id: Optional[int] = Field(default=None, foreign_key="contract.id")
    channels: str = ""               # 需發社群渠道 csv(FB,TG,X,LINE)
    notes: str = ""                  # 特別提醒
    draft_deadline: Optional[datetime] = None    # 初稿 Deadline(軟文)
    publish_deadline: Optional[datetime] = None  # 發佈 Deadline
    published_urls: str = "{}"       # {"website":..,"tg":..,"fb":..,"x":..,"line":..}

    # 向後相容 / 一般卡欄位
    assignee: str = ""
    creator: str = ""
    due_date: Optional[datetime] = None

    # ── bd-pr 轉稿(Pipeline A 的 AI 步驟)所需進稿參數 ──
    source_url: str = ""
    source_file: str = ""
    article_type: str = ""           # regular | sponsored | press-release
    supplier: str = ""               # 供稿方(押註替換)
    header_disclaimer: str = ""
    footer_disclaimer: str = ""
    job_id: Optional[int] = Field(default=None, foreign_key="job.id")

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
    actor: str = ""
    kind: str = ""   # created | moved | assigned | edited | commented | job_started | job_done | job_error | notified | billed
    detail: str = ""
    created_at: datetime = Field(default_factory=_utcnow)


class Notification(SQLModel, table=True):
    """通知雙線(取代 Slack 通知編輯 / TG 通知 BD)。先寫 log,留接口日後接真 channel。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(index=True, foreign_key="task.id")
    channel: str = ""   # editor(Slack 等價) | bd(TG 等價)
    target: str = ""    # 通知對象(名字)
    body: str = ""
    created_at: datetime = Field(default_factory=_utcnow)
