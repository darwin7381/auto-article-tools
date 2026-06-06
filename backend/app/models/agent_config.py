from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AgentConfig(SQLModel, table=True):
    """AI agent 設定（prompt + model 參數）—— 從 R2 搬進 DB，DB 成為唯一真相來源。

    text agent 用 system_prompt / user_prompt；image agent 用 prompt_template / size / quality。
    """

    name: str = Field(primary_key=True)  # contentAgent / prWriterAgent / copyEditorAgent / imageGeneration
    provider: str = ""
    model: str = ""
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    system_prompt: str = ""
    user_prompt: str = ""
    # image agent 專屬
    size: str = ""
    quality: str = ""
    prompt_template: str = ""
    updated_at: datetime = Field(default_factory=_utcnow)
