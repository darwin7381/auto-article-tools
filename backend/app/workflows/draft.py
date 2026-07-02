"""B 線軟文 AI 初稿:brief(需求描述)→ AI 產出初稿 markdown。

「軟文從人 0→1 寫,變 AI 草稿 → 編輯部精修」—— 設計文件 4.2 的驚喜點。
輸入:{"brief": "...", "client"?, "item_type"?(常規/專訪/深度), "angle"?, "length_hint"?}
輸出:{"markdown": 初稿}

Agent:優先用 DB 的 draftAgent(可在設定頁調);沒有就退回 prWriterAgent 的
provider/model + 內建初稿 system prompt(零依賴可跑)。
"""

from __future__ import annotations

from app.core.registry import Workflow, register
from app.core.stage import RunContext, Stage
from app.services.agent_config import get_agent_config
from app.services.llm import chat

_FALLBACK_SYSTEM = """你是 BlockTempo(動區動趨)資深撰稿編輯,擅長把商業需求寫成專業、可信、
好讀的繁體中文區塊鏈/加密貨幣軟文初稿。要求:
- 標題吸引但不誇大;導言 2-3 句點出讀者為什麼該在乎
- 結構化小標(##),每段聚焦一件事;適度引用數據/事實框架(不虛構具體數字)
- 語氣專業中立,置入自然,不像廣告傳單;結尾自然收束(可含行動引導)
- 產出 Markdown;無法確定的事實用 [待補:xxx] 標註留給編輯部
"""


def _build_prompt(data: dict) -> str:
    parts = [f"請為以下需求撰寫一篇軟文初稿(類型:{data.get('item_type') or '常規'}):"]
    if data.get("client"):
        parts.append(f"客戶 / 品牌:{data['client']}")
    if data.get("angle"):
        parts.append(f"切角:{data['angle']}")
    if data.get("length_hint"):
        parts.append(f"篇幅:{data['length_hint']}")
    parts.append(f"\n需求 brief:\n{data.get('brief', '')}")
    return "\n".join(parts)


async def _draft_ai(data: dict, ctx: RunContext) -> dict:
    brief = (data.get("brief") or "").strip()
    if not brief:
        raise ValueError("缺 brief(需求描述)—— 在卡片描述/特別提醒填寫後再跑")
    try:
        cfg = get_agent_config("draftAgent")
        system_prompt = cfg.system_prompt or _FALLBACK_SYSTEM
    except KeyError:
        cfg = get_agent_config("prWriterAgent")  # 借 provider/model,prompt 用內建
        system_prompt = _FALLBACK_SYSTEM
    output = await chat(
        provider=cfg.provider,
        model=cfg.model,
        system_prompt=system_prompt,
        user_prompt=_build_prompt(data),
        temperature=0.6,
        max_tokens=cfg.max_tokens,
    )
    return {**data, "model": f"{cfg.provider}/{cfg.model}", "markdown": output,
            "result_chars": len(output)}


register(
    Workflow(
        name="draft",
        description="B 線軟文 AI 初稿(brief → 初稿 markdown,編輯部精修用)",
        stages=[Stage(id="draft_ai", run=_draft_ai)],
    )
)
