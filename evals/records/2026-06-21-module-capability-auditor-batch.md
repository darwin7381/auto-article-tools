> ⚠️ 註(2026-06-21 後):**Strapi 已從專案移除**;本紀錄中 test_strapi / Strapi 相關項目已不存在,保留為當時稽核的歷史快照。

# 評估紀錄:9 大模組獨立稽核(批次)

- **日期**:2026-06-21
- **評估者**:module-capability-auditor(9 個獨立 Claude subagent,走訂閱、並行;未錨定維護者自評分)
- **定位**:**輔助佐證,不覆寫建構進度頁的模組分數**。稽核偏重「自動化測試覆蓋」故較嚴;
  維護者分數含設計成熟度 + 功能完整度 + 人工/整合驗證。兩者差距 ≈ **自動化測試債**。

| 模組 | 維護者分 | 獨立稽核分 | 一句話 |
|---|---|---|---|
| 進稿抽取 | 86 | 84 | 真實位置級斷言、覆蓋廣;.doc/RTF 編碼/gdoc 圖分支未測 |
| AI 內容處理 | 82 | 32 | 3 個 LLM agent + chat()/structured() 零直接測試 |
| 封面圖生成 | 82 | 58 | 只測壓縮 happy path;串流/重試/stage 編排零測 |
| 進階組稿 | 88 | 58 | 純函式有測;押註 3-tier/供稿方替換/寫回未測 |
| 任務系統 | 90 | 58 | 生命週期/SSE 重播有測;crash recovery/rerun/WAL 未測 |
| 設定/版本 | 84 | 38 | 版本生命週期有測;overlay/押註解析/Strapi 匯入零測 |
| WordPress 發布 | 82 | 41 | 零自動測試;封面掉失不回報、重複發布風險 |
| 觀測/評測 | 80 | 64 | 結構評分+telemetry 有測;未運維化、整合未測 |
| 前端 Dashboard | 84 | 83 | 功能韌性 production 級;前端零自動化測試(僅人工瀏覽器) |

> 共同主題:多數模組**程式邏輯經 code-review 與人工/整合驗證可用,但缺自動化單元測試**。
> 下一步優先補測順序(依風險):AI agent(mock chat)→ 發布(mock httpx)→ 任務系統 crash/rerun → 設定 overlay/押註 → 組稿 3-tier → 封面 generate_image。

---

## 進稿抽取 — 84
```
SCORE: 84
STATUS: Strong real-coverage extraction module; broad format support with genuine position/structure assertions, a few real-world gaps remain untested.
GAPS: .doc/.pages 成功路徑(無 LibreOffice)未跑;extract_html regex fallback、RTF 非 utf8 編碼、_extract_gdoc 圖嵌入/HTML 錯誤偵測未測;DOCX 巢狀表/合併格、PDF 多欄/旋轉未測;ingest 非 http(s) 圖(data:/相對)被 regex 靜默丟。
TEST_QUALITY: 真實位置斷言(text.index 排序)、精確圖數/URL 列、raised-error 訊息比對、true-negative(fitz 抓 0 表)後才斷言 fallback。非煙霧測試。
VERDICT: production 級、誠實到位置級覆蓋;殘留風險是二進位 .doc/.pages 與少數 fallback/編碼分支。
```

## AI 內容處理 — 32
```
SCORE: 32
STATUS: Solid retry/structured-output engineering, but the 3 LLM agents themselves have zero direct tests — all AI behavior is trusted, not verified.
GAPS: s_content_ai/s_pr_writer/s_copy_editing 無直接或 mock-LLM 測試;chat() 重試/4xx/empty-content/max_tokens clamp 未測;_fill() placeholder 缺失時靜默 append 無 guard;階段間 data dict 契約(markdown→html→wordpress)從未一起驗;內容掉失(專案自己列的最壞情況)無自動偵測(只靠人工跑 --judge)。
TEST_QUALITY: 既有斷言為真(eval/config lifecycle),但與被稽核模組核心錯位;test_llm_judge 測的是 judge 包裝,非 production agent，給假性安心。
VERDICT: 工程縝密(重試/驗證/clamp)但 AI 核心 trusted-not-tested。
```

## 封面圖生成 — 58
```
SCORE: 58
STATUS: Well-engineered streaming + graceful degradation, but only the trivial compression branch has any test.
GAPS: generate_image 零測(串流事件解析、b64、3x 重試、stream-fallback、"無圖" RuntimeError);s_cover_image 零測(D3 原文首圖分支、force_cover、生成→壓縮→save→featured 串接、失敗不擋流程);compress 靜默 except 吞錯未測;partial_images=2 可能靜默出半成品封面。
VERDICT: 程式紮實但 ~15% 邏輯有測,載重路徑(串流/重試/編排)全靠 code-review。
```

## 進階組稿 — 58
```
SCORE: 58
GAPS: resolve_disclaimers 3-tier(版本>Strapi>builtin)零測;供稿方［撰稿方名稱］替換未測;s_article_formatting 寫回 wp.content 未測(可能靜默 fallback 到 data.html);header/footer="none"、intro link、dropcap 邊界、heading 串接、author_id、RELATED_DEFAULT 預設連結直出 未測。
TEST_QUALITY: 純函式斷言真實(index 排序/class/色碼/hr);但 templates.py 解析與 article.py 寫回完全沒測。
VERDICT: 純 formatter 單測紮實,但押註解析/供稿方替換/寫回是靜默失敗區。
```

## 任務系統 — 58
```
SCORE: 58
GAPS: crash recovery(re-queue stuck)未測 — 最載重的 durability 宣稱無測;rerun-from-stage 未端到端測(unknown stage 靜默從頭跑);Semaphore 並行上限、WAL pragma、SSE live/timeout、error-path job、get_job 404/slim-full shaping 未測;_submit no-op(loop/queue 未綁→job 永遠 pending)。
TEST_QUALITY: 真實(TestClient+真 worker+真 SQLite,斷言實值/狀態);但廣度淺,硬保證(recovery/concurrency/rerun/WAL/error)未跑。
VERDICT: 架構好,但宣傳的韌性多靠設計註解非測試;crash-recovery 與 rerun 完全未驗。
```

## 設定 / 版本 — 38
```
SCORE: 38
GAPS: get_agent_config overlay(版本→config 合併,pipeline 依賴)未斷言;resolve_disclaimers 3-tier/none/供稿方替換零測;strapi.import_all(網路/upsert/401 fallback/欄位探測)零測且 API 不上拋部分失敗;site_config.disclaimer 比對/isActive 零測;create_version 空名 400 未測。
TEST_QUALITY: 版本生命週期一支好測(delete-active fallback 這個最棘手角落有測);但約 70% 表面(config overlay/押註/Strapi)無覆蓋。
VERDICT: 一支優質生命週期測,但 pipeline 依賴的 config overlay + 全部押註解析 + Strapi 遷移無測。
```

## WordPress 發布 — 41
```
SCORE: 41
STATUS: Functionally coherent WP REST publisher, but zero automated coverage and multiple silent-failure paths.
GAPS: publish_post/_upload_media_*/endpoint 零測;封面上傳失敗寫進 _featured_media_error 但回傳不含此欄→UI 無訊號;遠端 Content-Type 照單全收可能壞 media;_MIME 缺 gif/svg 一律當 png;無 media id 可用性驗證;無重試/冪等→網路失敗後 WP 已建文章但回 502→重試重複發布;raise_for_status 吞掉 WP JSON 錯誤訊息。
TEST_QUALITY: 無 —— 「需 live WP」只部分成立;payload 組裝/狀態驗證/override 合併/MIME/靜默分支皆純邏輯可用 fake AsyncClient 測,但沒測。
VERDICT: 程式合理但端到端未驗、滿是靜默失敗/重複發布風險。
```

## 觀測 / 評測 — 64
```
SCORE: 64
STATUS: Solid deterministic regression layer + clean per-stage telemetry; eval exists but is never operationalized.
GAPS: 無聚合/持久化/儀表板/告警/門檻(CLI 印 stdout 且 checks 失敗仍 exit 0,不能 gate CI);score_result 不在生產 pipeline 跑;token=0 當 provider 不回 usage 靜默;結構檢查是脆弱字串比對(模板變就默默壞);llm_judge 截斷 12000 字未測;runner 真實 elapsed_ms/tokens 端到端未測。
TEST_QUALITY: 真實斷言非煙霧,但只覆蓋兩函式 happy path,無失敗/邊界。
VERDICT: 可信的零成本回歸檢查 + 隔離良好的 opt-in judge,但是手動實驗工具,非生產觀測(無聚合/儲存/告警/gate)。
```

## 前端 Dashboard — 83
```
SCORE: 83
STATUS: 強 — 路由/深連結/durable-reattach/SSE+slim-poll/快取全部真實落地且設計縝密;扣分集中在零自動化前端測試 + 少量靜默失敗面。
GAPS: 前端零自動化測試(無 vitest/playwright,任何 regression 只能人工抓);slim poll ~13min 後僅 toast 逾時不自動再接;SSE .catch(()=>{}) 全吞錯(斷線無訊號);ResultHero 封面 startsWith('http')?cover:cover 死碼→相對封面 URL 不補絕對可能破圖;多處 catch 靜默;bundle ~750KB 未 code-split。
TEST_QUALITY: 前端完全沒有自動化測試;唯一手段=隔離瀏覽器人工實測(一次性、非可重跑回歸)。與後端 pytest 48/48 明顯不對稱。
VERDICT: 功能與韌性 production 級且 reattach/SSE/快取為亮點,但零前端測試 + 數處靜默降級使其無法更高;補最小 vitest+playwright 煙霧測試即可上探 90。
```
