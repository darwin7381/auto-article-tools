"""把 agent 設定（含客製 prompt）匯入 DB。

來源：seed/agents/*.json（從 R2 匯出的真實 production 設定）。
這是一次性匯入；之後 DB 是唯一真相，編輯走 DB（admin API 之後做）。

用法（在 backend/ 下）： uv run python seed.py
"""

from __future__ import annotations

import glob
import json
import os
from datetime import datetime, timezone

from app.models import AgentConfig, get_session, init_db

# R2 JSON 的 camelCase → DB 欄位 snake_case
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


def main() -> None:
    init_db()
    files = sorted(glob.glob("seed/agents/*.json"))
    if not files:
        print("⚠️  seed/agents/ 沒有檔案")
        return

    with get_session() as session:
        for path in files:
            name = os.path.splitext(os.path.basename(path))[0]
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
            fields = {
                col: raw[k] for k, col in _FIELD_MAP.items() if k in raw and raw[k] is not None
            }
            existing = session.get(AgentConfig, name)
            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
                existing.updated_at = datetime.now(timezone.utc)
            else:
                session.add(AgentConfig(name=name, **fields))
            print(
                f"✅ {name}: provider={fields.get('provider')}, model={fields.get('model')}, "
                f"system_prompt={len(fields.get('system_prompt', ''))} 字"
            )
        session.commit()
    print("🎉 agent 設定已匯入 DB")


if __name__ == "__main__":
    main()
