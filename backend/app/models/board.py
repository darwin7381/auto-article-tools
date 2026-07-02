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

# 刊例價(NT$/件;Banner 為每檔期)。營收認列引擎用:結案一件認列一件。
# 之後可搬進設定頁調整;金額為示意刊例,實收以合約 amount / Sheet 為準。
ITEM_PRICES: dict[str, int] = {
    "廣編稿": 60_000,
    "官網快訊": 20_000,
    "新聞稿": 0,
    "常規": 40_000,
    "專訪": 80_000,
    "深度": 100_000,
    "Banner": 50_000,
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


class TaskStatus(str, enum.Enum):
    """細粒度業務狀態 —— Notion A 線 12 態 + B 線 16 態 + C 線的全集。

    與 column_id 並存:「看板視圖粗(8 欄)、狀態機細(自動化/通知照這裡觸發)」。
    對照 docs/DELIVERY-BOARD-GAPS.md §2。空字串 = 舊卡未設定(相容)。
    """

    intake = "intake"                        # 需求進線 / 登錄
    quota_check = "quota_check"              # 確認額度中
    awaiting_accept = "awaiting_accept"      # 待接收任務(B 線撰稿)
    writing = "writing"                      # 撰寫中(B)
    draft_done = "draft_done"                # 已完成初稿(B)
    ai_processing = "ai_processing"          # AI 轉稿中(A)
    awaiting_upload = "awaiting_upload"      # 等待上稿(轉稿完成 → WP)
    site_pending = "site_pending"            # 已上稿(未發官網)
    site_live = "site_live"                  # 已上稿(已發官網)
    client_review = "client_review"          # 客戶潤稿中(B)
    client_approved = "client_approved"      # 客戶確認可發佈
    awaiting_schedule = "awaiting_schedule"  # 待排程 / 等待發佈
    scheduled = "scheduled"                  # 已排程發佈
    awaiting_social = "awaiting_social"      # 待填社群連結
    social_posted = "social_posted"          # 已發佈社群
    awaiting_line = "awaiting_line"          # 待 LINE 發佈(晚間檔)
    line_posted = "line_posted"              # 已發佈 LINE
    banner_live = "banner_live"              # Banner 已上架(C)
    banner_down = "banner_down"              # Banner 已下架(C)
    awaiting_bd_close = "awaiting_bd_close"  # 等待 BD 結案(回傳客戶)
    closed = "closed"                        # 結案
    archived = "archived"                    # 封存


# 狀態 → {中文標籤, 所屬看板欄 kind}。狀態被設定時卡片自動移到對應欄。
STATUS_META: dict[str, dict] = {
    TaskStatus.intake.value: {"label": "需求進線", "kind": "backlog"},
    TaskStatus.quota_check.value: {"label": "確認額度中", "kind": "ready"},
    TaskStatus.awaiting_accept.value: {"label": "待接收任務", "kind": "processing"},
    TaskStatus.writing.value: {"label": "撰寫中", "kind": "processing"},
    TaskStatus.draft_done.value: {"label": "已完成初稿", "kind": "processing"},
    TaskStatus.ai_processing.value: {"label": "AI 轉稿中", "kind": "processing"},
    TaskStatus.awaiting_upload.value: {"label": "等待上稿", "kind": "publish"},
    TaskStatus.site_pending.value: {"label": "已上稿(未發官網)", "kind": "publish"},
    TaskStatus.site_live.value: {"label": "已上稿(已發官網)", "kind": "publish"},
    TaskStatus.client_review.value: {"label": "客戶潤稿中", "kind": "client_review"},
    TaskStatus.client_approved.value: {"label": "客戶確認可發佈", "kind": "client_review"},
    TaskStatus.awaiting_schedule.value: {"label": "待排程 / 等待發佈", "kind": "publish"},
    TaskStatus.scheduled.value: {"label": "已排程發佈", "kind": "publish"},
    TaskStatus.awaiting_social.value: {"label": "待填社群連結", "kind": "distribution"},
    TaskStatus.social_posted.value: {"label": "已發佈社群", "kind": "distribution"},
    TaskStatus.awaiting_line.value: {"label": "待 LINE 發佈", "kind": "distribution"},
    TaskStatus.line_posted.value: {"label": "已發佈 LINE", "kind": "distribution"},
    TaskStatus.banner_live.value: {"label": "Banner 已上架", "kind": "distribution"},
    TaskStatus.banner_down.value: {"label": "Banner 已下架", "kind": "distribution"},
    TaskStatus.awaiting_bd_close.value: {"label": "等待 BD 結案", "kind": "done"},
    TaskStatus.closed.value: {"label": "結案", "kind": "done"},
    TaskStatus.archived.value: {"label": "封存", "kind": "archive"},
}

# 拖進某欄(kind)時,若卡片現有狀態不屬於該欄 → 給的預設細狀態。
COLUMN_DEFAULT_STATUS: dict[str, str] = {
    "backlog": TaskStatus.intake.value,
    "ready": TaskStatus.quota_check.value,
    "processing": TaskStatus.writing.value,       # A 線由 run_task_pipeline 設 ai_processing
    "client_review": TaskStatus.client_review.value,
    "publish": TaskStatus.awaiting_schedule.value,
    "distribution": TaskStatus.awaiting_social.value,
    "done": TaskStatus.closed.value,              # 手動拖進已結案 = 結案(billing 語意不變)
    "archive": TaskStatus.archived.value,
}


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
    sheet_ref: str = ""        # 指回 Google Sheet(財務真相)Entry-合約列的參照
    amount: float = 0.0        # 合約總額 NT$(手填;0 = 未填,顯示時退回額度×刊例估算)
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

    # ── 細粒度狀態機 + Notion 對齊補欄(G1/G2,見 docs/DELIVERY-BOARD-GAPS.md)──
    status: str = ""                             # TaskStatus 值;空 = 舊卡未設定
    scheduled_publish_at: Optional[datetime] = None  # 指定發佈時刻(排程,≠ 死線)
    line_proof_url: str = ""                     # LINE 發佈截圖 / 存證連結
    draft_doc_url: str = ""                      # 初稿 Google Doc 連結(B 線)
    site_published: bool = False                 # 官網已發旗標(急件先發官網分支)

    # ── C 線 Banner + Sheet 參照(G3)──
    takedown_date: Optional[datetime] = None     # Banner 下架日
    banner_spec: str = "{}"                      # {"slot":.., "size":.., "max_kb":..}
    placement_slot_id: str = ""                  # 連到廣告版位(placementslot.id)
    exec_sheet_ref: str = ""                     # 指回 Sheet Entry-執行列的參照

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
    """通知雙線(取代 Slack 通知編輯 / TG 通知 BD)。寫 log + 若設定了 Telegram 即真送出。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(index=True, foreign_key="task.id")
    channel: str = ""   # editor(Slack 等價) | bd(TG 等價)
    target: str = ""    # 通知對象(名字)
    body: str = ""
    created_at: datetime = Field(default_factory=_utcnow)


class PlacementSlot(SQLModel, table=True):
    """廣告版位(banner inventory)—— 前端 /placements 的共享真相(取代 per-瀏覽器 localStorage)。

    id 沿用前端字串 id(hp-leaderboard 等);C 線 Task 以 placement_slot_id 連回來。
    """

    id: str = Field(primary_key=True)
    surface: str = ""        # homepage | newsletter | line | social
    surface_name: str = ""
    name: str = ""
    size: str = ""
    format: str = ""
    max_kb: Optional[int] = None
    position_desc: str = ""  # 曝光位置說明
    status: str = "available"  # available | negotiating | booked
    client: str = ""
    schedule: str = ""       # 'YYYY/MM/DD–MM/DD'
    stage: str = ""          # 生命週期看板欄
    has_material: bool = False
    material_color: str = ""
    material_text: str = ""
    sort_order: float = 0.0
    updated_at: datetime = Field(default_factory=_utcnow)


class AutomationEvent(SQLModel, table=True):
    """排程引擎的防重複表:每個自動化動作(催稿/預警/晨報)以唯一 key 記錄,已觸發不再觸發。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)   # 例 draft_overdue:12 / digest:2026-07-02
    kind: str = ""
    task_id: Optional[int] = None
    detail: str = ""
    created_at: datetime = Field(default_factory=_utcnow)
