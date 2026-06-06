# BD 內容自動化平台 — 改造全紀錄與計劃

> 單一真相文件（living doc）。涵蓋：為何改造 → 討論與決策 → 目標架構 → 遷移計劃 → 目前進度 → 待辦。
> 最後更新：2026-06-06 · branch `feat/python-platform-scaffold`

---

## 0. 一句話

把現在「單一文章 pipeline 的 Next.js 全端工具」改造成**給 BD 部門的多工作流內容自動化平台**：Python 後端、工作流可程式化/CLI/排程、處理可靠、設定進資料庫。用 strangler 漸進切換，舊系統全程在線。

---

## 1. 為什麼要改造（動機 / 根因）

### 1.1 三個痛點（使用者提出）
1. **被綁死、無法用 API 調用**，也無法 CLI 化成單一元件
2. **處理非常卡**
3. 很多東西容易出 bug（例如 `Request En` JSON parse error）

### 1.2 根因（有程式碼證據，非臆測）
整條 8 階段 pipeline 的**編排邏輯活在瀏覽器 React 裡**：
- `src/components/file-processing/useProcessingFlow.tsx`（524 行）+ 8 個 `use*Stage` hook，用 callback 串接
- 主元件 `IntegratedFileProcessor.tsx`（**1632 行**），整篇內容掛在 React state、來回 8 趟 HTTP、每次變動重渲染
- 狀態用「R2 物件存不存在」當狀態機（無資料庫）
- LLM 回的 JSON 無邊界驗證，TS 型別 runtime 抹除 → 壞資料滲透到下游才爆

→ 結論：**痛點是架構分層錯，不是小 bug。** 編排該在伺服器端，不該在前端。

### 1.3 唯一的好消息
`src/services` + `src/agents`（約 5000 行）對 Next.js/React **零耦合**（grep `next/server`/`NextResponse`/`react` 全 0）。多 provider AI、文件轉換、R2、WordPress 發布等是可移植的**知識資產**。

---

## 2. 討論與關鍵決策（含被推翻的判斷）

> 過程中使用者明確要求「不要被沈默成本影響」「徹底分析最適合的架構」，並糾正了我兩個初判。以下是**最終定案**。

### 2.1 後端語言 = Python（語言很重要，非次要）
我一開始判斷「語言是次要軸」**是錯的**，已修正。原因：這個工作負載的重心是「處理亂輸入 + 馴服 LLM 半結構化輸出」，正是 Python 強、TS 結構性弱之處：
- **執行期驗證**：pydantic + instructor 在邊界驗證 LLM 輸出，驗不過自動重問 → 直接消滅 `Request En` 那類 parse bug。TS 型別 runtime 抹除做不到。
- **文件處理生態**：pymupdf / python-docx / unstructured 比 JS（pdf-parse 已棄養、node-canvas 原生惡夢）成熟，可減少對付費 ConvertAPI 的依賴。
- **資料庫 / ORM**：SQLAlchemy/SQLModel 成熟；現在根本沒 DB，要上。
- **多工作流自動化**：Python 是內部自動化主場。

### 2.2 不用 Temporal
使用者明確表態「非常爛」。運維過重、determinism replay 心智負擔，對內部工具是 over-engineering。

### 2.3 起步不用 Redis
Redis 只在「用 Celery（需 broker）」或「多 worker 跨 process 廣播」時才必要。內部 BD 工具規模（幾個編輯）用 **DB-backed job queue + in-process asyncio worker** 即可，durable 且零額外基礎設施。規模到了再加。

### 2.4 起步用 SQLite（非 Postgres）
單機、低寫入併發，SQLite(WAL) 夠。用 SQLModel 包好，未來換 Postgres 只是改連線字串 + 一次 migration。唯一注意：SQLite 需持久磁碟（容器/VM 掛 volume）；純 serverless 才需 Postgres/Turso。

### 2.5 不用本地 LLM
確定用 API 大模型。

### 2.6 並行模型（使用者特別問過）
- 工作負載是 **IO-bound**（時間花在等 LLM/API），單一 Python process 用 **asyncio** 即可同時跑多條工作流（A 等 OpenAI 時 B/C/D 前進）；加 semaphore 控上限，一台機器扛幾十～上百條。
- **CPU-bound 階段**（PDF/DOCX 解析、影像後處理）用 `asyncio.to_thread` 丟到 thread pool，不擋 event loop。
- 「in-process worker」限制的是**跨機器水平擴展**（那時才加 broker/Redis），不是單機並行。

### 2.7 repo 結構 = 在現有資料夾內加 `backend/` + `frontend/`
- **保住 Claude 記憶**（記憶綁資料夾路徑，換路徑 = 換命名空間）
- 打架風險經實測很低：唯一要處理的是 root `tsconfig.json` 的 `**/*` glob → 已加 `exclude: [frontend, backend]`
- **單一 git repo**，backend/frontend 是普通追蹤資料夾（不在裡面 `git init`）
- legacy Next app 原地不動，BD 繼續用

### 2.8 設定散在三處，R2 prompt 是真相 → 搬進 DB
循「設定頁面」追出設定其實散在：
1. **R2**（`blocktempo-ai/config/`）：4 個 AI agent 的 prompt+model（**production 真相**，比程式碼 default 大 10-15 倍、model 已從 gpt-4o 換成 openrouter/gemini-2.5-pro）
2. **Strapi**（本機 `localhost:1337`）：作者、頁首/頁尾免責範本、文章預設、預設內容
3. **env**：WordPress 憑證、LLM keys

→ 決策：把這些客製設定**搬進資料庫**，DB 成為唯一真相，不再 runtime 撈 R2。

### 2.9 前端
純展示 console（Vite + React SPA），所有邏輯/狀態在後端 + DB，只透過 Job API + SSE 講話。舊樣式整個重做（使用者極度不滿意）。沿用 TipTap 編輯器元件。

---

## 3. 目標架構

```
┌─────────────────────────────────────────────┐
│  Vite + React SPA（薄 console，沿用 TipTap）   │
│  選工作流 → 填輸入 → SSE 進度 → 審稿 → 發布     │
└───────────────┬─────────────────────────────┘
                │  只透過 Job API + SSE
┌───────────────▼─────────────────────────────┐
│  Adapters：HTTP API / CLI / 排程              │  ← 全部呼叫同一個 run_workflow
├─────────────────────────────────────────────┤
│  Orchestration：workflow registry + runner    │  ← 工作流是「資料」，加流程=加定義
├─────────────────────────────────────────────┤
│  Core：stages（async 純函式，pydantic I/O）    │  ← 可獨立測試
│   Provider 抽象：LLM / 文件 / 影像 / 儲存      │
├─────────────────────────────────────────────┤
│  Infra：SQLite(WAL) + DB job queue + R2        │  ← 設定/狀態進 DB，blob 存 R2
└─────────────────────────────────────────────┘
```

### 技術棧（精簡起步版）

| 層 | 選型 | 何時升級 |
|---|---|---|
| 後端 | Python 3.12+ / **FastAPI** | — |
| LLM 結構化 | **pydantic + instructor** | — |
| 編排/排程 | DB job queue + asyncio worker（+ 之後 APScheduler） | 多機器 → dramatiq/Prefect（+Redis）|
| 資料 | **SQLite(WAL) + SQLModel** | 併發寫入瓶頸 → Postgres |
| 佇列 | 無 | 跨 process → Redis |
| 文件 | pymupdf / python-docx | — |
| 影像 | OpenAI **gpt-image-2** | — |
| 物件儲存 | Cloudflare R2（boto3） | — |
| 前端 | Vite + React SPA | — |

---

## 4. 遷移計劃（Strangler，漸進，舊系統全程在線）

- **Phase 0** — 設定資產盤點 + 備份（R2 + Strapi）✅ R2 完成，Strapi 待啟動
- **Phase 1** — 後端骨架（FastAPI + SQLite + registry + runner + SSE + CLI）✅
- **Phase 2** — 設定搬進 DB + 第一條真實工作流 ✅
- **Phase 3** — 復刻完整 8 階段 pipeline ✅（見進度）
- **Phase 4** — 前端 console（Vite，config 驅動表單 + SSE + 編輯器 + 發布）⏳
- **Phase 5** — job 持久化/並行、admin 編輯 prompt、WordPress publish、觀測/eval、排程 ⏳
- **Phase 6** — 逐條工作流由 BD 切換到新平台，舊 repo 退役 ⏳

---

## 5. 目前進度（2026-06-06）

### ✅ 已完成並實測
- **隔離設定**：tsconfig exclude + gitignore，與 legacy Next app 不打架
- **後端骨架**：`backend/`，FastAPI + SQLModel(SQLite) + sse-starlette；`run_workflow` 單一編排入口，API(SSE) 與 CLI 共用
- **設定進 DB**：`AgentConfig` 表；`seed.py` 從 R2 匯出的 4 份設定匯入 DB（contentAgent 3318字、prWriter 4516字、copyEditor、imageGeneration）。runtime 讀 DB，**不再碰 R2**
- **4 條 workflow**：`echo`（示範）、`extract`、`standardize`（抽取+標準化）、`article`（完整 7 階段）
- **完整 `article` pipeline 實測通過**（WEEX 简中新聞稿，真實 LLM/影像 API，132 秒）：
  - extract（DOCX→文字）→ content_ai（gemini-2.5-pro 標準化，简→繁+在地化）→ pr_writer（gemini 潤稿）→ format_conversion（md→HTML）→ copy_editing（**instructor+pydantic 結構化 WordPress 參數**）→ cover_image（**gpt-image-2 生成 1536×1024 封面**）→ article_formatting（組稿）
- **前端骨架**：`frontend/`（Vite+React），SSE 客戶端 + 最小 console，`pnpm build` 通過
- **抓到並修掉一個真 bug**：思考型模型（gemini-2.5-pro）reasoning 吃光 output 預算 → `content=None` → 下游 `len(None)` 崩潰。修法：明確給足 `max_tokens`（未設預設 32k、過大收斂到 64k）+ 空內容防護擲明確錯誤。正是 instructor/pydantic 邊界驗證要解的那類問題的縮影。
- **影像模型**：切換到 **gpt-image-2**（DB + seed + 程式碼 fallback 三處一致，實測通過）

### 驗證證據
- CLI：`uv run python cli.py article --input '{"file": "..."}'`
- HTTP/SSE：`POST /workflows/{name}/run`
- 產出：繁中標準化新聞稿 + WordPress 參數 + gpt-image-2 封面圖

---

## 6. 復刻缺口 + 待辦（誠實對照）

> 「核心 7 階段 pipeline」已復刻並實測；但對照舊系統**全部功能**仍有以下缺口。

### 6.1 復刻缺口（舊系統有、新平台還沒有）
- [ ] **URL 進稿**：舊系統吃網址 / Google Docs（parse-url / process-url / process-gdocs）；新平台目前只吃本機檔案路徑
- [ ] **檔案上傳端點**：瀏覽器上傳 → 儲存（舊 upload→R2）
- [ ] **輸出持久化**：save-markdown 至 R2、圖片代理（/api/images）、viewer
- [ ] **WordPress 發布**：publish + upload-image-from-url（外送動作，需明確授權才接）
- [ ] **TinyPNG 圖片壓縮**
- [ ] **article_formatting 完整版**：接 Strapi 頁首/頁尾免責範本（目前為輕量組稿；Strapi 未啟動）
- [ ] **admin 編輯 agent 設定**：現只有 GET /agents，無 PUT（舊系統有完整後台），含「reset to default」防呆
- [ ] **TipTap 人工審稿環節**：前端 console 仍是骨架

### 6.2 測試缺口
- [ ] `article` 完整流程僅測 1/4 份文件（WEEX 简中 docx）→ 其餘 2 PDF + 繁中 docx 待跑
- [ ] `article` 經 **HTTP/SSE 路徑**未單獨跑過（與 CLI 同 runner，仍應補）
- [ ] 前端僅驗 `pnpm build`，未實際開瀏覽器接後端

### 6.3 平台本來就要做的（非復刻項）
- [ ] **Strapi 設定備份**：啟動本機 Strapi 後跑 `config-backup-2026-06-05/backup-strapi.sh`
- [ ] **job 持久化 + 並行**：jobs 寫進 DB、worker 拉取、asyncio semaphore 控併發上限
- [ ] **OpenAPI codegen**：FastAPI schema → 前端型別安全 client（見 `shared/`)
- [ ] **觀測 + eval**：per-stage trace（input/output/cost/latency）+ prompt 回歸測試
- [ ] **前端 console 真做**：config 驅動表單 + 進度 UI + 編輯器 + 發布
- [x] ~~commit 里程碑~~（`c2e66e2`，2026-06-06，64 檔）

---

## 7. 資產與連結

- **設定備份**：`config-backup-2026-06-05/`（R2 8 物件已下載；Strapi 待補）+ `README.md`
- **repo 結構說明**：`MONOREPO.md`
- **後端**：`backend/README.md` · **前端**：`frontend/README.md` · **型別合約**：`shared/README.md`
- **舊計劃（已過時，僅存參考）**：HedgeDoc <https://md.blocktempo.ai/5m1xSHAuSRe3K9LTLsSWNA>
- **本文件**：`docs/PLATFORM-REWRITE.md`（唯一真相，後續更新這份）
