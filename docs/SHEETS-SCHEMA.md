# BD/DM Google Sheets 真帳本 schema(實讀分析)

> 2026-07-02 實讀分析。

## 存取設定(接手的人看這裡)

- **Service Account:`bd-platform@miniai-crab-labs.iam.gserviceaccount.com`**(GCP 專案 `miniai-crab-labs`,2026-07-02 由 Joey 建立)
- key:`backend/.secrets/google-sa.json`(gitignored,絕不進 git);env:`GOOGLE_SERVICE_ACCOUNT_JSON`(settings.py / .env.example)
- 四份 Sheet 都已共用給該 SA(檢視者);之後要寫 Entry-執行 時升編輯者
- 新增 Sheet 要給平台讀 → 共用給同一個 SA email 即可

## 四份 Sheet(全部可讀 ✅)

| 代號 | 標題 | Sheet ID |
|---|---|---|
| BD-1 | BD Media Service (2025) | `1ONqVzIUJ2-2nkOES53UV-3g0NJlNAHYh67WFEe6vXYU` |
| BD-2 | BD Media Service (2026)(現行) | `1KLMlgNNXksTPnNK8VuMYBBSZOM1o1SohSvZj_Retetc` |
| DM-1 | 業務執行/獎金紀錄表(2024.Oct~2025) | `1Heyo59yqQys7DejBhSIAerZ3f9zSwfizqUmPHkGIbkU` |
| DM-2 | 業務執行/獎金紀錄表 (2026)(現行) | `1Ra9Awwz0E7wn4umaNG79a691q_MI6MvXfmMx1fzqY8E` |

2026 現行帳本(BD-2 / DM-2)分頁結構與 2025 版一致(DM-2 多「函式注記」)。

## 2026 現況快照(2026-07-02 實讀)

- **DM-2 Entry-合約 30 份:結案 10 / 執行中 9 / 等待執行 11** —— 注意 2026 的合約狀態詞彙改為「執行中/等待執行」(2025 是「生效/過期」),平台狀態機要吃兩套
- Entry-執行(文章) 2026 年持續寫入(最近 7/2 MEXC 快訊);「合約名稱與合約期」有「待補」的髒資料,同步要能容錯
- **BD-2:合約 31 列,已確認到帳 24 筆,2026 到帳總額 ≈ 226,130 USDT**

## DM-1(營運帳本)關鍵分頁

- **Entry-合約**:合約編號(`#25Qxxx`)、客戶、合約名稱、**狀態(結案/過期/生效)**、期程始終、**合作模式(單篇/2個月/3個月/半年約/1年約/Agency月結/Global Media)**、合約檔案、渠道分配 Note、簽約BD、DM Flow、之後是**額度欄:廣編/官網快訊/常規報導/深度報導/專訪/Custom/TG/FB/LINE…**
- **Cal-合約額度**:以「合約名稱與合約期」為 key → 各品項「額度 + 剩餘額度」(公式算,**剩餘可為負**=超交付)
- **Entry-執行(文章)**:發佈日期、文章標題與連結、稿件/服務類型、**扣客戶額度(哪類)**、社群推播(FB, TG, LINE)、客戶、合約名稱與合約期、合約檢查欄、**獎金欄(總獎金/主審+比例/主筆/輔助)**
- **Entry-執行(活動,廣告,影音)** / **Entry-執行(KOL,GlobalMedia)**:非文章品項的執行列(Banner 走這裡)
- **Base-客戶**:**完整客戶 CRM!** 客戶名稱、**維繫優先層級(1-5)**、最新合約狀態、剩餘額度摘要、負責 DM、Delivery Note、最新合約檔案、**項目類型(CEX…)**、合作模式、**聯繫渠道(TG群組)**、**客戶維繫狀態(談續約/正常執行)**、負責 BD、BD Note
- **參數表**:編輯獎金 per 品項(**廣編 20 → 註「AI化,該獎金已不適用」**、常規 35、深度 200…)、獎金期比例
- Base-人員、Cal-獎金(編輯)、Cal-獎金沖銷(編輯)、(BD 系列分頁已停用 → 移到 BD-1)

## BD-1(收款/BD 獎金帳本)關鍵分頁

- **Entry(from n8n)**(n8n 自動寫入!):合約編號(`#104xxxx`)、客戶、合約、狀態、期程、模式、**確認到帳 / 到帳日 / 合約金額 / 幣別(USDT!)/ 收款代號**、引入者、主攻手
- **Cal-獎金期認列**:生效合約編號、Case、Start/End、**Revenue、Bonus Pool(15%)、到帳日、之後是逐月認列欄(2025-1月…)** —— **收入認列 = 依合約期程逐月攤提**
- 參數表:BD Bonus Rate 15%(年收達 2M 美金 → 20% 隔年適用)

## 🎯 平台角色定位(Joey 定調 2026-07-02,最高原則)

> **平台負責「Entry(登錄)」,不負責「計算」。**
> Cal-* 分頁(合約額度 / 獎金認列 / 獎金分配 / 沖銷)由 Sheet 內公式自動算、有人維護 —— 平台**不要**複製、取代或重算這些邏輯。
> 平台要取代的是 **DM 的手動登錄動作**:
> - 合約談成 → 寫一列 **Entry-合約**(DM Sheet)
> - 文章結案 → 寫一列 **Entry-執行(文章)**(發佈日期/標題連結/類型/扣哪類額度/社群渠道/客戶/合約名稱與合約期)
> - Banner/活動 → 寫一列 **Entry-執行(活動,廣告,影音)**
> Sheet 的公式接手後自動扣額、算獎金。讀 Cal-* 只做「顯示參考」(如客戶 360 顯示真剩餘額度),不做為平台計算來源。

## 觀察筆記(輔助理解,非平台工作範圍)

- 幣別 USDT;BD 獎金 = Revenue×15% 逐月攤提(Cal-獎金期認列);編輯獎金 per 品項(廣編已因 AI 化取消)—— 這些都是 **Sheet 自己算**,平台只需把 Entry 寫對。
- 額度類別含 TG / FB / LINE / Custom(Entry-執行的「扣客戶額度」要能填這些值)。
- Base-客戶是完整 CRM(維繫層級/狀態/項目類型/聯繫渠道)—— 客戶 360 顯示可對齊。
- n8n 已在寫 BD Sheet 的 Entry(from n8n)(收款線)—— 平台的 Entry 範圍是 **DM Sheet 的三張 Entry**,不動 n8n 那條。
- 合約編號:DM `#25Qxxx` / BD `#104xxxx`;「合約名稱與合約期」是 Entry-執行 對回合約的 join key(有「待補」髒資料,寫入時要容錯)。
