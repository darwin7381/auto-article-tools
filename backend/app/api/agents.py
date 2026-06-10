"""Agent 設定 API —— 取代舊 R2 後台。設定存 DB，可線上編輯 prompt + reset 到 seed 預設。"""

from __future__ import annotations

import glob
import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.models import AgentConfig, get_session

router = APIRouter(prefix="/agents", tags=["agents"])

# seed JSON（從 R2 匯出的真實 production 設定）的 camelCase → DB snake_case
_FIELD_MAP = {
    "provider": "provider",
    "model": "model",
    "temperature": "temperature",
    "maxTokens": "max_tokens",
    "topP": "top_p",
    "systemPrompt": "system_prompt",
    "userPrompt": "user_prompt",
    "size": "size",
    "quality": "quality",
    "promptTemplate": "prompt_template",
}


class AgentUpdate(BaseModel):
    """部分更新；只送要改的欄位。"""

    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    size: Optional[str] = None
    quality: Optional[str] = None
    prompt_template: Optional[str] = None


@router.get("")
async def list_agents() -> list[dict]:
    with get_session() as s:
        rows = s.exec(select(AgentConfig)).all()
        return [
            {
                "name": r.name,
                "provider": r.provider,
                "model": r.model,
                "system_prompt_chars": len(r.system_prompt),
                "user_prompt_chars": len(r.user_prompt),
                "updated_at": r.updated_at,
            }
            for r in rows
        ]


@router.get("/{name}")
async def get_agent(name: str) -> AgentConfig:
    with get_session() as s:
        r = s.get(AgentConfig, name)
        if r is None:
            raise HTTPException(404, f"找不到 agent: {name}")
        return r


@router.put("/{name}")
async def update_agent(name: str, body: AgentUpdate) -> AgentConfig:
    """編輯 agent 設定（DB 是唯一真相）。"""
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    with get_session() as s:
        r = s.get(AgentConfig, name)
        if r is None:
            raise HTTPException(404, f"找不到 agent: {name}")
        for k, v in patch.items():
            setattr(r, k, v)
        r.updated_at = datetime.now(timezone.utc)
        s.add(r)
        s.commit()
        s.refresh(r)
        return r


def _seed_fields(name: str) -> dict[str, Any] | None:
    matches = glob.glob(f"seed/agents/{name}.json")
    if not matches:
        return None
    with open(matches[0], encoding="utf-8") as f:
        raw = json.load(f)
    return {col: raw[k] for k, col in _FIELD_MAP.items() if k in raw and raw[k] is not None}


@router.post("/{name}/reset")
async def reset_agent(name: str) -> AgentConfig:
    """重置回 seed/agents/{name}.json 的真實 production 預設。

    ⚠️ 防呆：seed 是「從 R2 匯出的真值」而非過時程式碼 default，所以 reset 是安全的；
    但仍是破壞性操作，會覆蓋目前 DB 內容。
    """
    fields = _seed_fields(name)
    if fields is None:
        raise HTTPException(404, f"找不到 {name} 的 seed 預設（seed/agents/{name}.json）")
    with get_session() as s:
        r = s.get(AgentConfig, name)
        if r is None:
            r = AgentConfig(name=name, **fields)
        else:
            for k, v in fields.items():
                setattr(r, k, v)
        r.updated_at = datetime.now(timezone.utc)
        s.add(r)
        s.commit()
        s.refresh(r)
        return r
