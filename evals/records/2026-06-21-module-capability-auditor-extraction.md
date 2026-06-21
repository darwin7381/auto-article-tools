# 評估紀錄:進稿抽取模組

- **日期**:2026-06-21
- **評估者**:module-capability-auditor(Claude subagent,獨立、未錨定開發者自評分)
- **目標**:`backend/app/services/{extract,ingest,url_extract,markdown}.py` + `tests/test_conversion.py`
- **結論分數**:**74 / 99**(開發者原自評 86 → 獨立稽核下修)

```
SCORE: 74
SUBSCORES: DOCX=88 PDF=85 URL=22 HTML/RTF=58 OCR=80 .doc/.odt=72 md→HTML=70
STATUS: Strong, genuinely-tested file-extraction core (DOCX/PDF/ODT/OCR) but the entire
        URL ingestion path — a primary BD intake channel — is completely untested.

COVERED:
- DOCX: inline image placeholder ordering between paragraphs (ALPHA < IMG0 < BRAVO),
  heading→#, bullet→-, hyperlink→[text](url), table→markdown. Body-order traversal asserted.
- PDF: coordinate reading-order (index-asserted), xref dedup across pages (2→1),
  borderless-table pdfplumber fallback (guarded on fitz=0), scanned-PDF OCR end-to-end (real model).
- OCR: RapidOCR PP-OCRv5 text recovery, RapidTable scanned-table→markdown, deterministic
  HTML-table-parse + structure-gate unit test independent of the model.
- Scanned-PDF guards: OCR-unavailable raises; multi-page thin-text-layer ratio guard raises.
- .odt: odfdo image position, heading, hyperlink, multi-paragraph list items not glued, table,
  Pictures/ artifact cleanup.
- Error paths: .doc/.image/.unknown rejected with asserted messages.
- md→HTML: <table>/<td>, figure.article-image + lazy, fenced code.
- 26 tests pass; 4 real BD assets (HashKey/WEEX/Bluefin/數碼港) asserted.

SCENARIOS_OK: 真實 BD 新聞稿 DOCX(繁/简)、純文字 PDF、多表多圖+logo 去重 PDF、
  掃描 CJK OCR、ODT、RTF/TXT/MD、空白成稿守門。

GAPS (重要):
- URL 路徑(url_extract.py)ZERO 測試:_extract_webpage、trafilatura→Firecrawl fallback、
  400/150 字門檻、Google Docs export、HTTP 錯誤分流全未驗。最網路脆弱、最高靜默失敗風險。
- ingest.py / _embed_images 未測:{{IMGn}}→markdown 圖替換、圖 URL 收集、孤兒佔位清理、
  URL 路徑用 regex 重抓 URL vs 檔案路徑用 save_image 的分歧邏輯,兩者都未跑過。
- extract_html 本機 HTML 圖片硬寫 images=[] → 本機 HTML 圖片被靜默丟棄(與 URL trafilatura 路徑不一致)。
- .doc/.pages 只測「soffice 缺 → 報錯」;實際 .doc→docx 轉換從未跑過,可能默默搞爛。
- DOCX 巢狀/編號清單層級、合併儲存格、表格內圖未測;_docx_table_md 攤平多行儲存格未驗。
- PDF 多欄/旋轉頁無測,round() 排序可能錯亂欄序(靜默)。

TEST_QUALITY: 真斷言、非擺設,明顯高於平均 —— 程式化造夾具並斷言硬語意(相對位置、
  精確去重數、精確表格儲存格、超連結標記、訊息比對報錯)。掃描守門測試很到位。
  唯一弱點:測試侷限於檔案抽取,網路/ingest 膠合層完全只靠人工檢視信任。

JUSTIFICATION: 檔案抽取引擎強、真實驗證、針對真正會出事的 bug 設斷言 → DOCX/PDF/OCR/ODT 高分。
  但嚴格起見要計入未測表面:URL 進稿(gdocs/Medium/WeChat/任意站)是一級 BD 進稿管道、
  也是最脆弱的程式,卻完全無測;ingest/_embed_images 是所有檔案路徑都會經過的膠合層也未測。
  這些不是邊角,是核心能力在生產未驗證地跑。完整應近 90;大片未測但關鍵的 URL/ingest 表面
  與多個靜默丟失風險把誠實總分拉到 74。
```

## 後續行動(本紀錄直接導出的待辦)
1. **最高優先**:補 URL 路徑 + ingest/_embed_images 自動化測試(mock httpx/trafilatura/firecrawl/gdocs)→ 把 URL 22 拉起來。
2. extract_html 本機 HTML 圖片不應靜默丟(對齊 URL 路徑保留圖)。
3. .doc 實際轉換、DOCX 巢狀清單/合併儲存格、PDF 多欄 的測試。
