from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.models import AgentConfig, get_session

router = APIRouter(prefix="/agents", tags=["agents"])


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
