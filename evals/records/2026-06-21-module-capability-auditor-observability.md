# 評估紀錄:觀測 / 評測模組

- **日期**:2026-06-21
- **評估者**:module-capability-auditor(Claude subagent,獨立)
- **目標**:`backend/app/services/{evals,llm}.py`、`worker/runner.py`、`tests/test_core.py`、`cli.py`、`evals/README.md`
- **結論分數**:**58 / 99**(開發者原自評 84 → 獨立稽核大幅下修)

```
SCORE: 58
STATUS: Honest, well-scoped structural eval + per-stage telemetry; quality eval deliberately
        offloaded to subagent records, but no metrics aggregation/persistence-for-analysis,
        no dashboard, no alerting, judge not wired per-article.
COVERED: cjk_ratio (HTML/URL-stripped, empty-safe) + score_result (11 structural invariants)
  — test-backed. Per-stage elapsed_ms (time.monotonic) + token capture via usage_var contextvar
  (chat + structured both _record); runner sums total_tokens (test asserts total_ms==100).
  Stage events persisted in job.events_json, re-extracted for frontend per-stage view.
SCENARIOS_OK: CLI 回歸(eval --file/--url)跑真 workflow、印 per-stage 耗時/tokens + 結構評分;
  token 在 raw httpx 與 instructor 兩條路都抓得到;contextvar 是非同步下 per-stage 捕捉的正確原語。
GAPS: (1) score_result 從不在生產 pipeline 呼叫 —— CLI/dev-only,無 per-article 品質/結構閘。
  (2) metrics 未聚合/未存分析用 —— 只活在 per-job events_json,無跨 job 表、無 rollup、
  無時序、無儀表板、無告警閾值。(3) 內容品質評審完全在 codebase 外(subagent 紀錄);
  成本上合理,但生產 headless 跑零品質訊號。(4) token 捕捉靜默失敗:provider 沒回 usage→0 token
  (與免費/快取無法區分);直接呼叫 provider 會繞過 usage_var。(5) score_result 只讀
  result["wordpress"]/output_url,空/壞 result 默默得 0/11 不報形狀錯。(6) 無 latency/token
  regression baseline —— 數字只印不比,效能退化看不見。
TEST_QUALITY: 真但薄 —— 單一 test_eval_scorecard 有實質斷言(cjk_ratio 真值 + passed>=9 且
  total_ms==100 端到端)。但無負向/failing-check 測試、無 cjk_ratio 邊界、無 token 捕捉經
  真實 contextvar round-trip 的測試、無並行階段 isolation 測試。最易失敗的 contextvar telemetry
  幾乎未測。
JUSTIFICATION: 結構評分器與 per-stage telemetry 乾淨正確、決定論,把品質評審推給 subagent 的
  架構選擇有理且誠實記錄 —— 是實作不是 vaporware。但作為「觀測/評測」模組,從「會算 metrics」
  到「可運維的觀測」差距很大:無聚合、無儀表板、無告警、無 regression baseline、評分器不在生產
  per-article 跑、token 捕捉靜默失敗。測試只碰兩個函式的 happy path。中-琥珀偏紅。58。
```

## 後續行動
1. 把 score_result 接成 pipeline 可選最終結構閘(per-article),不只 CLI。
2. metrics 落一張跨 job 表 + 簡單時序;補 latency/token regression baseline。
3. 補負向測試(缺 slug→False)、cjk_ratio 邊界、token contextvar round-trip 測試。
