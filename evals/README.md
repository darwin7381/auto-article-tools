# evals/ — Claude subagent 評估工作區(走訂閱,不燒 API)

> **品質評審 = 開發/評估範疇 → 用 Claude subagent(訂閱 usage)。不是生產 agent,不放進專案做 API 呼叫。**

## 範疇界線(寫死,別再搞混)

| 範疇 | 是什麼 | 用什麼 | 花誰的錢 |
|---|---|---|---|
| **生產端 LLM** | **只有** pipeline 那幾個 agent:content_ai / pr_writer / copy_editing / cover_image | 原本正確、已測試的 API 方案(openrouter) | 專案 API 額度 |
| **品質評審 / 模組盤點** | 評文章忠實度/丟內容/幻覺、給模組打分 | **Claude subagent(Agent 工具)** | Claude 訂閱 usage |

→ 品質評審**不該**是專案內的 API 呼叫(那會燒 openrouter)。它是 dev-time 活動,由操作這個 repo 的 Claude 用 subagent 跑。

## 目錄
```
evals/
  README.md      # 本檔
  agents/        # 每個 evaluator subagent 的角色定義(檢查什麼 + rubric + 輸出格式)
  records/       # subagent 跑出的評估紀錄(YYYY-MM-DD-<role>-<target>.md)
```

## 怎麼跑(給操作 repo 的 Claude)
1. 選 `agents/<role>.md` 角色。
2. 用該角色 prompt **spawn 一個 Claude subagent**(Agent 工具),把目標(模組碼 / 原文+成稿)餵進去。
3. 要抗偏誤就**並行 spawn 多個**取共識。
4. 結果寫進 `records/`。

## 重要:records 是「參考輸入」,不是儀表板分數的唯一真相
建構進度頁的模組分數 = **維護者的工程判斷 + 實際 pytest 覆蓋**為主,subagent 紀錄為輔助佐證。
**不可**讓單一 subagent 的主觀評分直接覆寫儀表板分數(那是過去踩過的雷)。分數調整要有 pytest/實證支撐。
