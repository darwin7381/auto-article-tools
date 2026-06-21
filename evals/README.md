# evals/ — Claude subagent 評估工作區

> 開發/盤點時用 **Claude subagent** 評估各模組與成稿品質,評估紀錄 commit 進這裡當稽核軌跡。
> **走 Claude 訂閱 usage,不燒專案的 openrouter API 額度。**

## 為什麼是 subagent,不是專案內 LLM 呼叫

兩個本質不同的情境,別混為一談:

| 情境 | 跑的時機 | 有 Claude session? | 用什麼 | 花誰的錢 |
|---|---|---|---|---|
| **生產執行** | cron / API / 上傳,headless | ❌ 沒有 | 只能專案內 LLM | openrouter API($) |
| **開發 / 盤點 / 驗證**(這裡) | Claude Code session 活著時 | ✅ 有 | **Claude subagent** | Claude 訂閱 usage |

我們現在做的「評分各模組、驗證成稿品質」是**開發時**的事 → 用 subagent:省錢、可並行、可版本控管。
（生產環境若未來要每篇自動 QA,那時沒有 Claude 可委派,才需要在專案內接 LLM —— 目前不做,
不在 pipeline 留會燒 API 的程式碼。）

## 目錄

```
evals/
  README.md              # 本檔
  agents/                # 每個 evaluator subagent 的角色定義(檢查什麼 + rubric + 輸出格式)
  records/               # 帶日期的評估紀錄(YYYY-MM-DD-<agent>-<target>.md)= 建構進度頁分數的依據
  fixtures/              # 評估用的參考素材(指向 input-example)
```

## 怎麼跑(給操作這個 repo 的 Claude)

1. 選一個 `agents/<role>.md` 角色。
2. 用該角色的 prompt **spawn 一個 subagent**(Task/Agent 工具),把目標(模組程式碼路徑 / 原文+成稿)餵給它。
3. 要獨立、抗偏誤時,**並行 spawn 多個**同角色 subagent 各自評,取共識(對齊 superpowers 的對抗式驗證精神)。
4. 把 subagent 回傳的結構化結果寫成 `records/YYYY-MM-DD-<role>-<target>.md`。
5. 建構進度頁(`frontend/src/Status.tsx`)的模組分數應**引用** records,不是憑空填。

## 評分尺度(0–99)

成熟度 × 覆蓋面 × 風險 × 測試覆蓋的綜合。≥85 綠 / 70–84 琥珀 / <70 紅。
寧嚴勿鬆 —— 寬鬆評分是大忌。
