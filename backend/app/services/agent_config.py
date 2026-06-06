from __future__ import annotations

from app.models import AgentConfig, get_session


def get_agent_config(name: str) -> AgentConfig:
    """從 DB 讀 agent 設定（取代舊系統的 R2 getAgentConfig）。"""
    with get_session() as session:
        cfg = session.get(AgentConfig, name)
        if cfg is None:
            raise KeyError(f"找不到 agent 設定: {name}（請先跑 seed.py 匯入）")
        return cfg
