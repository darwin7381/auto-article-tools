# 設定備份 — 2026-06-05

這份備份循「設定頁面」追出**所有**設定的儲存位置，補齊了舊 `backup-configs.sh`（只備 R2 agent）漏掉的部分。

## 設定散在三處

| # | 儲存位置 | 內容 | 由哪個 UI 管理 | 本次備份狀態 |
|---|---|---|---|---|
| 1 | **Cloudflare R2** bucket `blocktempo-ai`，前綴 `config/` | 4 個 AI agent 設定（prompt + model 參數）+ metadata | `/admin/ai-config`（AIConfigManager） | ✅ 已下載 → `r2/` |
| 2 | **Strapi**（headless CMS，`http://localhost:1337`） | 作者、頁首/頁尾免責範本、文章類型預設、預設內容設定 | 設定頁 ConfigurationPanel（`/config-test`） | ⚠️ 待補（Strapi 未啟動）→ `strapi/` |
| 3 | **環境變數**（`.env.local`） | WordPress 憑證、各家 LLM API key、R2/Strapi 連線 | 無 UI | ℹ️ 已在 `.env.local`，本備份不複製機密 |

> 另：`src/config/article-templates.ts` 有一份靜態 default 範本（已在 git，不需備份）。
> 編輯器草稿存在瀏覽器 localStorage（transient，非設定）。

## 1. R2 AI Agent 設定（✅ 已備份於 `r2/`）

檔名把路徑的 `/` 換成 `__`：

| 檔案 | 原始 R2 key | 說明 |
|---|---|---|
| `config__agents__contentAgent.json` | `config/agents/contentAgent.json` | Agent 1：來源稿件標準化／翻譯（**openrouter / gemini-2.5-pro**，systemPrompt 3318 字）|
| `config__agents__prWriterAgent.json` | `config/agents/prWriterAgent.json` | Agent 2：主編潤稿/校對雙模式（systemPrompt 4516 字）|
| `config__agents__copyEditorAgent.json` | `config/agents/copyEditorAgent.json` | Agent 3：WordPress 參數生成 |
| `config__agents__imageGeneration.json` | `config/agents/imageGeneration.json` | 封面圖生成設定 |
| `config__ai-config.json` | `config/ai-config.json` | 舊的合併版設定（2025-07）|
| `config__agents___metadata.json` / `config__agents__metadata.json` | metadata | 更新紀錄 |
| `config__metadata__last-updated.json` | `config/metadata/last-updated.json` | 最後更新時間 |

> ⚠️ **重要**：R2 這份是 production 真正在跑的 prompt，比程式碼裡的 default 大 10～15 倍、model 也不同。程式碼 default 已過時，**不可當作真相來源**。admin 後台的「reset to default」會用過時 default 覆蓋這些，請小心。

## 2. Strapi 設定（⚠️ 待補）

Strapi 位於 `http://localhost:1337`，是**本機**實例，備份當下未啟動。涉及的 collection：

- `/api/authors` — 作者
- `/api/header-disclaimer-templates` — 頁首免責範本
- `/api/footer-disclaimer-templates` — 頁尾免責範本
- `/api/article-type-presets?populate=*` — 文章類型預設
- `/api/default-content-setting?populate=*` — 預設內容設定（single type）

**補備份方式**：啟動 Strapi 後，於本資料夾執行 `./backup-strapi.sh`（已備妥）。

> ❓ 待釐清：這個 Strapi 的資料庫實際在哪？是否有獨立備份？production 是否真的依賴它，還是只是本機開發遺留？
