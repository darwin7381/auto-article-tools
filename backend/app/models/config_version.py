from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConfigVersion(SQLModel, table=True):
    """具名設定版本（prompt 組合 / 押註組合）。

    scope 例：`agent:contentAgent`、`disclaimer`。同一 scope 下多個具名版本，
    其中一個 is_active=True 是「目前生效」的。版本管理 = 可命名/切換/刪除/回溯。
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    scope: str = Field(index=True)
    name: str
    data_json: str = "{}"
    is_active: bool = False
    created_at: datetime = Field(default_factory=_utcnow)
