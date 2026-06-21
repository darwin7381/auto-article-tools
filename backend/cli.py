"""CLI 入口 —— 與 API 共用同一個 run_workflow runner。

用法（在 backend/ 下）：
    uv run python cli.py --list
    uv run python cli.py echo --input '{"text": "hello"}'
    uv run python cli.py eval --file ../input-example/xxx.docx     # 跑 article 並評分(回歸)
"""

from __future__ import annotations

import argparse
import asyncio
import json

import app.workflows  # noqa: F401  匯入即註冊所有 workflow
from app.core.registry import WORKFLOWS
from app.worker.runner import run_workflow


async def _run(name: str, input_json: str) -> None:
    async for ev in run_workflow(name, json.loads(input_json)):
        print(f"[{ev.event}] {json.dumps(ev.data, ensure_ascii=False)}")


async def _eval(file: str | None, url: str | None, judge: bool = False) -> None:
    from app.services.evals import score_result

    inp: dict = {"article_type": "press-release"}
    inp["file" if file else "url"] = file or url
    result = None
    stages: list[dict] = []
    source_md = ""  # 抽取後原文,供 --judge 比對忠實度
    async for ev in run_workflow("article", inp):
        if ev.event == "stage" and ev.data.get("status") == "done":
            if ev.data["id"] == "extract":
                source_md = (ev.data.get("output") or {}).get("markdown", "")
            stages.append({"id": ev.data["id"], "elapsed_ms": ev.data.get("elapsed_ms"),
                           "tokens": ev.data.get("tokens")})
            print(f"  ✓ {ev.data['id']:20} {(ev.data.get('elapsed_ms') or 0)/1000:5.1f}s  "
                  f"{ev.data.get('tokens') or 0} tok")
        elif ev.event == "done":
            result = ev.data["result"]
        elif ev.event == "error":
            print("❌ error:", ev.data.get("message"))
            return
    card = score_result(result or {}, stages)
    print(f"\n=== 結構評分 {card['score']} ===")
    for k, v in card["checks"].items():
        print(f"  {'✅' if v else '❌'} {k}")
    m = card["metrics"]
    print(f"\n總耗時 {m.get('total_ms', 0)/1000:.1f}s · 總 tokens {m.get('total_tokens', 0)} · "
          f"內文 {m['content_chars']} 字")
    if card["failed"]:
        print("未通過:", "、".join(card["failed"]))
    if not judge:
        print("\n(內容品質評審建議走 evals/ 的 subagent[訂閱];或加 --judge 用選用的開發工具,會用 API key)")
        return
    from app.services.evals import llm_judge  # ⚠️ 選用開發工具,非生產;會用 API key

    wp = (result or {}).get("wordpress") or {}
    print("\n=== llm_judge 品質評審(opt-in 開發工具,比對原文 vs 成稿) ===")
    try:
        j = await llm_judge(source_md, wp.get("content", ""), inp["article_type"])
    except Exception as exc:  # noqa: BLE001
        print("❌ judge 失敗:", exc)
        return
    print(f"  綜合 {j.overall} · 忠實 {j.faithfulness} · 翻譯 {j.translation} · "
          f"可讀 {j.readability} · 結構 {j.structure}")
    for label, items in (("成稿遺失(原文有)", j.missing_content), ("疑似幻覺(原文無)", j.hallucinations)):
        for x in items:
            print(f"  ⚠️ {label}: {x}")
    if j.issues:
        print("  其他:", "、".join(j.issues))


def main() -> None:
    p = argparse.ArgumentParser(description="跑一條 workflow（與 API 共用同一個 runner）")
    p.add_argument("workflow", nargs="?", help="workflow 名稱 或 eval")
    p.add_argument("--input", default="{}", help="JSON 輸入")
    p.add_argument("--file", help="eval:稿件檔路徑")
    p.add_argument("--url", help="eval:稿件 URL")
    p.add_argument("--judge", action="store_true",
                   help="eval:加跑 llm_judge 品質評審(選用開發工具,會用 API key;routine 建議走 subagent)")
    p.add_argument("--list", action="store_true", help="列出所有 workflow")
    args = p.parse_args()

    if args.list or not args.workflow:
        print("可用 workflow:", ", ".join(WORKFLOWS.keys()) or "(無)")
        return
    if args.workflow == "eval":
        if not (args.file or args.url):
            print("eval 需 --file 或 --url")
            return
        asyncio.run(_eval(args.file, args.url, args.judge))
        return
    asyncio.run(_run(args.workflow, args.input))


if __name__ == "__main__":
    main()
