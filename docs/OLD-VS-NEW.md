# 舊版 vs 新版 — 完整功能 / 機制 / UIUX 對照報告

> 2026-06-18。第一手逐檔比對：舊版 = `src/`（Next.js 全端），新版 = `backend/`(FastAPI) + `frontend/`(Vite)。
> 誠實標出新版**超越**、**對等**、**較弱/還沒做**三類。

---

## 0. 總覽差異

| 面向 | 舊版 | 新版 | 評 |
|---|---|---|---|
| 架構 | Next.js 全端,流程編排活在瀏覽器 React(8 個 use*Stage hook + 1632 行 IntegratedFileProcessor) | Python FastAPI 後端編排(單一 run_workflow)+ Vite 薄前端 | ✅ 新版分層正確 |
| 可程式化 | 綁死前端,無法 API/CLI 化 | API + CLI 同一個 runner;可排程 | ✅ 新版 |
| 狀態/任務 | 無 DB,用「R2 物件存在與否」當狀態;刷新即失 | SQLite durable job(pending→running→done/error)+ 並行 + 崩潰復原 + SSE + 斷線重播 | ✅ 新版 |
| 設定 | R2(agent prompt)+ Strapi(範本) | 全進 SQLite + **具名版本管理**(切換/回溯) | ✅ 新版 |
| 文件處理 | **ConvertAPI(付費)** + pdf-parse | 本地 **pymupdf + python-docx**(零外部、免費) | ✅ 新版 |
| 圖片壓縮 | TinyPNG API | 本地 **Pillow**(省 ~84%) | ✅ 新版 |
| 認證 | **Clerk(登入/權限/protected 路由)** | **無**(內部工具,任何人有連結即可用) | ⚠️ 新版缺 |
| 進階組稿 | **ArticleFormattingProcessor**(dropcap/引言/標題正規化/相關閱讀/TG banner) | 輕量組稿(僅 h1+押註+封面+內文) | ❌ 新版大缺口 |

---

## 1. 逐階段流程對照(核心 pipeline)

舊版 8 階段(前端 callback 串)→ 新版 7 stage(後端宣告式)。逐一比：

| 階段 | 舊版機制 | 新版機制 | 差異 |
|---|---|---|---|
| 進稿/上傳 | `/api/upload`→R2;`/api/parse-url`(gdocs/medium/wechat 分流) | `/uploads`→本地;`url_extract`(trafilatura + firecrawl fallback) | 對等,新版多 firecrawl fallback |
| 抽取 | ConvertAPI PDF→DOCX→文字;`processors/process-docx`、`process-gdocs` | pymupdf/python-docx;gdocs export 技巧 | ✅ 新版免付費 |
| content_ai | `/api/process-openai`(contentAgent) | `content_ai` stage(同 contentAgent prompt,讀 DB) | 對等 |
| pr_writer | `/api/advanced-ai-processing`(prWriterAgent) | `pr_writer` stage | 對等 |
| 轉 HTML | `/api/format-conversion`(markdownToHtmlService) | `format_conversion`(markdown lib) | 對等 |
| copy_editing | `/api/copy-editing`(copyEditorAgent)→ WordPress 參數(title/slug/excerpt/categories[id]/tags[id]) | `copy_editing`(instructor+pydantic 結構化,同欄位) | ✅ 新版有 pydantic 邊界驗證(殺壞 JSON) |
| 封面圖 | `/api/generate-cover-image`(imageGenerationAgent) | `cover_image`(gpt-image-2 **streaming**,避免長連線斷) | ✅ 新版串流更穩 |
| **article_formatting** | **ArticleFormattingProcessor**(見下節,功能多) | **輕量**:h1 + 頁首押註 + 封面 figure + 內文 + 頁尾押註 | ❌ **新版功能遠少於舊版** |
| 上稿 | `/api/wordpress-proxy/publish` + `upload-image-from-url` | `/publish`(含封面上傳媒體庫) | 對等,新版有發布前確認 |

---

## 2. ❌ 新版最大缺口:進階組稿(ArticleFormattingProcessor)

舊版 `article_formatting` 會做以下,新版**全部沒有**：

1. **Dropcap**：第一段第一個字放大首字(智能跳過 HTML 標籤/引言區/數字)
2. **引言區塊(intro_quote)**：用 AI 摘要生成 `<p class="intro_quote">`,含「前情提要 / 背景補充」連結模板
3. **標題層級正規化**：h2→h3、h3→h4、h4→h5(由高到低避免連鎖替換)
4. **文末相關閱讀**：2–4 篇相關文章連結(粗體;廣編稿用紅色連結樣式)
5. **TG Banner**：相關閱讀前插入官方 Telegram 橫幅圖
6. **完整 fullTemplate 組版**：引言→押註→分隔線→dropcap 內文→主體→相關閱讀(廣編/新聞各一套)

> 舊版這塊自評完成度約 64%,且「前情提要/背景補充自動搜尋 BlockTempo」「相關閱讀自動搜尋」仍是預設模板未真接。但**dropcap / 引言 / 標題正規化 / TG banner / 相關閱讀模板 / 廣編紅連結**是已實作、新版沒有的。
> 影響：新版產出的成稿是「乾淨內文 + 押註 + 封面」,但**不符合 BlockTempo 實際上稿的視覺規範**(沒有首字放大、引言區、相關閱讀、TG banner)。這是要補的第一優先。

---

## 3. ✅ 新版超越舊版的地方

1. **可靠性**：durable job(刷新/斷線/重開機都不丟,自動接回)— 舊版刷新即死、一次只能跑一篇
2. **可程式化**：API + CLI + 可排程;舊版綁死前端
3. **可觀測**：每階段耗時 + 模型徽章 + 整體進度;舊版只有進度條
4. **看得到 AI 改了什麼**：階段間行級 diff;舊版黑箱
5. **從任一步重跑**(可編輯該步輸入);舊版只能整條重來
6. **設定版本管理**：prompt / 押註具名版本,可切換回溯;舊版直接覆蓋無歷史
7. **設定頁**：預設 vs 現用 並排對照;舊版分開
8. **文件處理免付費**：pymupdf/python-docx/Pillow 取代 ConvertAPI/TinyPNG
9. **影像串流**：gpt-image-2 streaming 根治長連線被中介掐斷
10. **結構化輸出**：instructor+pydantic 邊界驗證,殺掉舊系統的 `Request En` JSON parse bug
11. **dashboard UI**：側邊欄 + 主題 + RWD + toast;舊版 4-tab 較陽春
12. **自動化測試**:pytest 10/10;舊版無

---

## 4. ⚠️ 新版還沒有 / 較弱(缺口清單)

| # | 缺口 | 舊版狀態 | 影響 |
|---|---|---|---|
| G1 | **進階組稿**(dropcap/引言/標題正規化/相關閱讀/TG banner) | 已實作 | 🔴 高 — 成稿不符上稿規範 |
| G2 | **登入/權限**(Clerk) | 有 sign-in/protected | 🟡 中 — 內部工具,但 tunnel 公開有風險 |
| G3 | **TipTap 編輯器深度**:舊版有連結/圖片/表格 modal + HTML 雙模式 + 全頁編輯 | 完整 | 🟢 新版已做雙模式+工具列,深度略少(全頁模式無) |
| G4 | **Strapi 設定真匯入**(作者/頁首頁尾範本/文章預設) | Strapi 在跑 | 🟡 新版 importer 備好,需 Strapi 開機;目前用內建範本頂著 |
| G5 | **分類/標籤 名稱→ID 解析** | 舊版也是 AI 直接吐 ID(未對 WP taxonomy 查) | 🟢 兩版同樣限制(AI 猜 ID) |
| G6 | **觀測+eval**:成本追蹤、prompt 回歸測試 | 舊版也沒有 | 🟢 兩版都缺 |
| G7 | **R2 輸出儲存**:舊版成稿/圖存 R2 | 新版預設本地、R2 選用(未設金鑰) | 🟢 本地可用,部署再開 R2 |

---

## 5. 行為 / 流程差異(非缺口,是設計選擇)

- **模式**:舊版「全自動/半自動」在 prep-publish / publish-news 階段自動確認+自動發布;新版「手動(逐步審稿)/自動(跑完直接發)」概念對等,自動模式跑完用選定狀態自動發。
- **文稿類型**:兩版都有 一般/廣編稿/新聞稿 + 開頭/結尾押註 + 供稿方替換［撰稿方名稱］。新版押註內建範本複刻自舊版 `article-templates.ts`,且可版本化。
- **viewer**:舊版 `/viewer/[...key]`(markdown/html 雙視圖);新版 `/files/output/{n}` 直接完整 HTML 文件。
- **作者 ID**:舊版按文稿類型自動帶(廣編=1 BTEditor / 新聞=2 BTVerse);新版 TYPE_DEFAULTS 有記錄但**發布時未自動帶入 author**(表單可手填)— 小缺口。

---

## 6. 結論與建議補強優先序

新版在**架構、可靠性、可維護性、可程式化、設定管理**上全面超越舊版,而且把舊版的核心痛點(卡、不可 API 化、易 bug、付費依賴)都解了。

但有**一個高優先功能缺口**必須補,才能說「完整 ≥ 舊版」：

1. 🔴 **進階組稿**(G1):把 ArticleFormattingProcessor 的 dropcap / 引言區 / 標題正規化 / 相關閱讀 / TG banner 移植到新版 `article_formatting` stage。這是新版產出能不能直接上 BlockTempo 的關鍵。
2. 🟡 **作者 ID 自動帶入**(§5):依文稿類型自動填 author。小改。
3. 🟡 **Strapi 匯入或拍板用內建範本**(G4):決定是否開 Strapi。
4. 🟡 **登入/權限或至少 tunnel 加密**(G2):若要長期公開。
5. 🟢 觀測/eval(G6)、R2 輸出(G7):規模到了再補。
