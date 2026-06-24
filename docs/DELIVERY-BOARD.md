# Delivery 跨部門 Pipeline 看板 — 設計

> 取代 Notion「新聞.廣編稿進度表」+「深度.專訪.常規稿進度表」兩張進度表,把整條
> **Delivery(業務稿處理)** 業務線搬進平台,並把現有 bd-pr 文章自動化變成這條線裡的
> 「AI 轉稿」一步。來源:`auto-bd-sys-v1/Delivery_操作手冊`。

## 1. 這條線是什麼

Delivery = 把 BD 談進來的客戶稿件,從**合約 → 審稿 → 轉稿 → 上稿 → 社群推播 → 回傳客戶
→ 扣合約額度**整條跑完。橫跨三個角色:

| 角色 | 人 | 在線上做什麼 |
|---|---|---|
| BD(商務開發) | Alex、Jessica | 談案、丟需求、回傳客戶 |
| DM(Delivery Manager) | Meg、Kessy | 串接點:審稿、查額度、轉稿、追進度、改狀態 |
| Editor/主審 | Joe、Luci、胖丁 | 審稿、撰稿(軟文)、發官網、發社群 |
| 合約端 | Rosie | 合約條件 |

## 2. 三條 Pipeline

| Pipeline | 品項 | 流向 | 額度 |
|---|---|---|---|
| **A** | 廣編稿 / 官網快訊 / 新聞稿 | 接稿 → 審稿 → **bd-pr 轉稿** → WordPress 草稿 → 編輯審+發官網 → 社群 → 回傳 | 廣編/官網快訊扣;新聞稿不扣 |
| **B** | 軟文(常規 / 專訪 / 深度) | 登錄需求 → 主審撰稿 → 客戶過稿 → 排程 → 發官網 → 社群 → 回傳 | 各品項扣 |
| **C** | Banner | 整理規格 → 通知 Joe 上架 → 驗證回傳 → 追下架日 → 下架 → 登錄 | Banner 扣(紀錄另頁) |

bd-pr(我們的 7 階段文章自動化)只在 **Pipeline A 的「AI 轉稿」** 這一步;軟文是人寫、Banner 是上架。

## 3. 看板階段(欄位)

跨三條 pipeline 的統一階段,卡片用 `pipeline` + `item_type` 區分細節,可 group/filter 重新切:

| # | 欄位 | kind | A | B | C |
|---|---|---|---|---|---|
| 1 | 需求進線 | backlog | 客戶丟稿/BD 同步 | BD 登錄需求 | 圖檔進來 |
| 2 | 待審/確認額度 | ready | DM 初審+查 Cal | DM 確認需求+查 Cal | 確認規格+查 Cal |
| 3 | 製作中 / AI 轉稿 | processing | **bd-pr 轉稿(Job)** | 主審撰稿 | 整理上架資訊 |
| 4 | 客戶確認 | client_review | (常略過) | 客戶過稿(反覆) | — |
| 5 | 待發佈 / 排程 | publish | 已上稿草稿、編輯審+排程 | 排程 | 通知 Joe 上架 |
| 6 | 社群推播 | distribution | 官網+FB/TG/X→LINE 晚8:30 | 同 A | 上架+驗證 |
| 7 | 已結案 | done | 回傳客戶 + 扣額度 | 同 A | 下架+登錄 |
| 8 | 封存 | archive | — | — | — |

**狀態自動同步(bd-pr Job ↔ 看板)**:job `running` → 製作中;job `done` → 待發佈(編輯接手);
`error` → 留製作中標紅。人也能手動拖,雙向都記 activity。

## 4. 合約與額度(取代 Google Sheet「Cal-合約額度」)

- **一份合約 = N 篇稿件的容器**;履約進度 = 已交 vs 約定。
- Contract 各品項額度(6 類):廣編、官網快訊、常規、專訪、深度、Banner;新聞稿不扣。
- 稿件結案 → 自動扣對應品項額度(`Entry-執行` 等價);額度 < 0 允許(超扣)但標記待補約。
- 卡片/合約頁顯示剩餘額度;額度耗盡時警示。

## 5. 整合接口(留接口,符合手冊雙線通知)

- **通知雙線**:`notify_editor`(Slack 等價,狀態到「待發佈」通知編輯審稿)、
  `notify_bd`(TG 等價,狀態到「社群推播/結案」通知 BD 回傳客戶)。目前寫進 notification
  log + activity,接口可日後接現有 Telegram/Discord plugin。
- **發佈連結回填**:稿件存 官網/TG/FB/X/LINE URL(取代 Notion 連結欄)。
- 押註/審稿規則(廣編 2000 字、敏感字改寫、中→台用語、文末導流 ≤3、Dropcap)已在 bd-pr 處理。

## 6. 前端(正規看板產品)

- **三視圖**:Board(kanban,欄=group 維度)、List(分組可收合清單)、Table(試算表,可排序)。
- **Group by**:階段 / pipeline / 客戶 / BD / DM / Editor / 合約 / 優先級。
- **Filter**:pipeline、品項、狀態、負責人、客戶、合約、到期、文字搜尋。
- 卡片:客戶 + 品項 + 角色 + 額度 + 到期 + 社群進度 + AI 即時管線(Pipeline A 跑 bd-pr 時)。
- 詳情抽屜:全 Delivery 欄位 + 合約額度 + 發佈連結回填 + 通知按鈕 + 留言協作 + 活動時間軸 + 開完整管線。
