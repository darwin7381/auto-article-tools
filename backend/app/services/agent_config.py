from __future__ import annotations

from app.models import AgentConfig, get_session
from app.services import versions


def get_agent_config(name: str) -> AgentConfig:
    """讀 agent 設定。優先用『目前生效的具名版本』(ConfigVersion)，
    沒有版本時退回 DB 的 AgentConfig（seed 匯入的原始 live）。pipeline 讀這個。"""
    active = versions.active_version(f"agent:{name}")
    if active:
        with get_session() as session:
            base = session.get(AgentConfig, name)
        # 用版本資料覆蓋到一個 AgentConfig 實例（不寫 DB，只供本次執行）
        data = active["data"]
        cfg = base or AgentConfig(name=name)
        for k in ("provider", "model", "temperature", "max_tokens", "top_p",
                  "system_prompt", "user_prompt", "size", "quality", "prompt_template"):
            if k in data and data[k] is not None:
                setattr(cfg, k, data[k])
        return cfg

    with get_session() as session:
        cfg = session.get(AgentConfig, name)
        if cfg is None:
            raise KeyError(f"找不到 agent 設定: {name}（請先跑 seed.py 匯入）")
        return cfg
