from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SiteConfig(SQLModel, table=True):
    """從 Strapi 搬進 DB 的客製設定（作者、頁首/頁尾免責範本、文章預設等）。

    用 (kind, key) 定位，value_json 存原始結構。DB 成為唯一真相 → 脫離 Strapi。
    kind 例：author / header_disclaimer / footer_disclaimer / article_type_preset / default_content
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    kind: str = Field(index=True)
    key: str = ""  # 同 kind 下的識別（如 author name、template 名）；單例設定可空
    value_json: str = "{}"
    updated_at: datetime = Field(default_factory=_utcnow)
