# 評估紀錄:補完測試後第二輪獨立稽核

- **日期**:2026-06-21
- **評估者**:module-capability-auditor(7 個獨立 Claude subagent,走訂閱)
- **背景**:第一輪稽核發現多模組缺自動化測試 → 本輪新增 47 個測試(pytest **48 → 95**)→ 重跑稽核。

| 模組 | 稽核① | 稽核②(補測後) | Δ | 仍待補 |
|---|---|---|---|---|
| AI 內容處理 | 32 | **71** | +39 | structured() 內部、usage 計量、agent_config overlay(此模組測試中 mock) |
| WordPress 發布 | 41 | **68** | +27 | publish.py 端點層、cover_image_path 分支、_auth/_base |
| 設定 / 版本 | 38 | **71** | +33 | strapi.import_all 整段、activate/delete False 分支、footer 三層對稱 |
| 進階組稿 | 58 | **84** | +26 | dropcap 邊界、無 intro 押註路徑、intro link/cover figure 分支 |
| 任務系統 | 58 | **74** | +16 | crash-recovery re-queue、Semaphore 上限、WAL、eventbus live race |
| 封面圖生成 | 58 | **74** | +16 | retry 復原路徑、TypeError 非串流 fallback、prompt_template 代換 |
| 觀測 / 評測 | 64 | **73** | +9 | token contextvar 經真實 runner round-trip、運維化(聚合/儀表板/告警) |
| 進稿抽取 | 84 | 84 | — | .doc 成功路徑、RTF 編碼、gdoc 圖嵌入分支(未重跑) |
| 前端 Dashboard | 83 | 83 | — | 前端零自動化測試(未動,僅人工瀏覽器) |

## 本輪新增的測試檔
- `tests/test_ai.py`(9):3 個 LLM 階段(mock chat/structured)、_fill、chat() 重試/空回/4xx 不重試/max_tokens clamp/未知 provider
- `tests/test_publish.py`(6):payload 組裝、狀態、future+date、分類標籤濾 id、媒體上傳、失敗不擋
- `tests/test_config.py`(10):get_agent_config overlay、resolve_disclaimers 3-tier、supplier 替換、site_config 過濾
- `tests/test_cover.py`(7):generate_image 串流(completed/partial/空)、s_cover_image D3/生成/失敗不擋、compress 壞資料 fallback
- `tests/test_job.py`(8):stage_index、rerun 跳上游、error 事件、API 404/error-job/rerun/slim-vs-full
- `tests/test_formatting.py`(3):s_article_formatting 寫回 wp.content + 作者自動帶入 + 尊重已指定作者
- `tests/test_core.py` +2:score_result 負向(缺欄位→False)、cjk_ratio 邊界
- `tests/test_ingest.py` +2:URL 只收 http(s) 圖、extract_html 片段 fallback

## 仍待補(下一輪,較深路徑)
strapi.import_all(mock httpx)、jobrunner crash-recovery + Semaphore 上限、publish.py 端點層、
token contextvar 經真實 runner、前端 vitest+playwright 煙霧測試。
