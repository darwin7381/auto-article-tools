# 抽取模組 — 覆蓋面 / 指標 / 依賴審計

> 對象:`backend/app/services/extract.py`（檔案）、`url_extract.py`（連結）、`markdown.py`（md→HTML）。
> 目的:用專業角度盤點「所有可能的進稿格式」、各環節用什麼依賴達成、依賴夠不夠強、缺口與升級路線。
> 測試:`backend/tests/test_conversion.py`（合成夾具 + 真實素材，30 項全綠）。

---

## 1. 輸入格式覆蓋矩陣（檔案 + 連結）

### 檔案

| 格式 | 支援 | 抽取路徑 / 依賴 | 文字 | 表格 | 內嵌圖 | 圖位置 | 連結 | 標題/清單 |
|---|---|---|---|---|---|---|---|---|
| **.docx** | ✅ | python-docx（自走 body 順序） | ✅ | ✅→markdown | ✅ | ✅ inline 保位 | ✅ `[t](url)` | ✅ `#` / `-` |
| **.pdf**（數位） | ✅ | PyMuPDF（座標排序）+ pdfplumber fallback | ✅ | ✅ 有框(fitz)+無框(pdfplumber) | ✅ | ✅ 依座標插入 | 文字內 | 段落 |
| **.pdf**（掃描） | ✅ | + RapidOCR（opt-in，整頁無文字才觸發） | ✅ OCR | — | 影像 | — | — | — |
| **.md** | ✅ | 直讀 | ✅ | ✅(下游 md→HTML) | URL | n/a | ✅ | ✅ |
| **.txt** | ✅ | 直讀 | ✅ | — | — | — | — | — |
| **.html/.htm** | ✅ | trafilatura（本機檔） | ✅ | ✅ | URL | 主文順序 | ✅ | ✅ |
| **.rtf** | ✅ | striprtf（純文字） | ✅ | 攤平 | ❌ | — | 純文字 | — |
| **.doc**（舊版 Word） | ✅* | LibreOffice headless → docx 路徑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **.odt / .pages** | ✅* | LibreOffice headless → docx 路徑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **圖片檔**(png/jpg…) | ⛔ 明確報錯 | 需 OCR（建議轉 PDF 走掃描路徑） | — | — | — | — | — | — |
| 其他副檔名 | ⛔ 明確報錯 | — | — | — | — | — | — | — |

> *`.doc/.odt` 需系統有 LibreOffice（`brew install --cask libreoffice`）；未偵測到 `soffice` 時丟 `ValueError` 附安裝指引，不靜默。

> 「明確報錯」= 丟 `ValueError` 並帶可行動建議（例「請先另存為 .docx/.pdf」），不靜默帶殼跑完整 AI 流程。

### 連結（`url_extract.py`）

| 來源 | 支援 | 路徑 / 依賴 |
|---|---|---|
| Google Docs | ✅ | `export?format=docx` → python-docx（含圖片嵌入） |
| Medium / WeChat / 一般網站 | ✅ | 直抓 + trafilatura；被擋/殼頁 → firecrawl CLI 渲染後重抽 |
| 死鏈 / 反爬失敗 | ✅ 明確報錯 | 抽取 < 150 字 → 報錯（不帶垃圾跑流程） |

---

## 2. 比舊版強在哪（不是退化版，是進化版）

舊版 PDF 走 **ConvertAPI（付費）→ DOCX → mammoth（JS）→ HTML**，靠 mammoth 自然 inline 保位。新版：

- **PDF 不再付費**：PyMuPDF 直接在 PDF 層做版面座標排序，**圖片/表格依閱讀順序插回原位**（修掉「圖片全被丟到頁尾」的位置 bug；真實素材數碼港 PDF 實測:圖片落在 0.0 / 0.83 / 0.88、表格落在 0.48 / 0.62，而非全擠尾端）。
- **DOCX 連結保真**：python-docx 的 `.text` 預設**會丟掉超連結文字**；本模組自走 XML，把超連結轉 `[文字](url)`、標題轉 `#`、清單轉 `-`、表格轉 markdown，並把內嵌圖佔位符 `{{IMGn}}` 放在它在段落中的實際位置。
- **圖片去重**：同一張 logo 跨頁多次出現，以 xref 全域去重（數碼港 8 次出現 → 4 張唯一圖）。
- **多了 .md/.txt/.html/.rtf** 進稿（舊版上傳只收 .pdf/.docx）。

---

## 3. 測試指標（test_conversion.py 斷言的「不變式」）

合成夾具（程式即時造，CI 必跑、可斷言肉眼難查的排列）:

| 指標 | 斷言 |
|---|---|
| **DOCX 圖片位置** | `index(前段) < index({{IMG0}}) < index(後段)` — 圖片夾在正確段落間 |
| **DOCX 結構** | `# 頭條標題`、`- 項目一/二` 出現 |
| **DOCX 超連結** | `[動區連結](https://blocktempo.ai/)` 出現（防 .text 丟連結回歸） |
| **DOCX 表格** | `\| 表頭A \| 表頭B \|` + `\| --- \| --- \|` |
| **PDF 閱讀順序** | `index(上文) < index({{IMG0}}) < index(下文)` |
| **PDF 圖片去重** | 同圖跨兩頁 → `len(images) == 1` |
| **HTML/RTF/TXT/MD** | 各自抽到關鍵文字、圖片清單型別正確 |
| **邊界** | `.doc`→報錯含「LibreOffice」；圖片檔→含「OCR」；未知→含「不支援」 |
| **md→HTML** | `<table>`/`<td>`、`<figure class="article-image">`+lazy、`<code>` |

真實素材（有檔才跑）:HashKey docx、WEEX 简中 docx、Bluefin 純文字 PDF、數碼港 PDF（表格≥2 + 圖去重==4）。

---

## 4. 依賴審計（2025–2026 現況研究結論）

| 現用依賴 | 負責 | 判定 | 備註 |
|---|---|---|---|
| **PyMuPDF 1.27** | PDF 文字/表格/圖+座標 | **續用（預設）** | 最快、無 ML、原生 PDF→markdown 且文字+表格+圖排序正確。⚠️ **授權 AGPL-3.0**：對外託管產品需確認合規（或購商業授權）。 |
| **pdfplumber 0.11** | PDF 無框線/複雜表 fallback | **新增** | MIT、純 Python（pdfminer.six）；fitz `find_tables` 抓 0 時用文字策略補，過品質閘（≥2列≥2欄、≥60%有值、平均儲存格短）防把散文誤判成表。 |
| **RapidOCR**（opt-in） | 掃描/圖片型 PDF OCR | **新增** | Apache-2.0、onnxruntime（**無 torch/GPU**）、CJK 佳；整頁可抽文字<10字才觸發、引擎惰性載入。`uv sync --extra ocr` 啟用。 |
| **LibreOffice headless** | .doc/.odt 轉檔 | **新增（系統依賴）** | 舊二進位 `.doc` 唯一可靠 OSS 路徑（純 Python 無解）；轉 docx 後沿用全保真路徑，逾時/失敗皆報錯。 |
| **python-docx 1.2** | DOCX 自走抽取 | **續用** | 原生 DOCX 手走 body 順序是正解（確定性、真順序、表格/圖/連結全可控）；mammoth/markitdown 反而會丟巢狀表。 |
| **python-markdown** | md→HTML | **續用** | 與抽取正交，無更換理由。 |
| **trafilatura 2.0 + firecrawl** | 網頁/HTML 主文 | **續用** | 文章正文抽取標竿（WCXB F1 0.841）。 |
| **striprtf** | RTF→純文字 | **續用** | 純 Python、無重依賴。 |
| Docling | 表格重/複雜 PDF | **評估後不採** | MIT 但拖 torch + HF 模型下載（數百 MB），對精簡 stack 不划算；pdfplumber+fitz 已覆蓋 90%+。真需要時再以 feature flag 加 `docling-slim`。 |
| pymupdf4llm | PDF→md | **評估後不採** | 同 AGPL；雖更省事，但會打掉現有 `{{IMGn}}` 佔位 + 位置斷言測試，自走 fitz 仍可控且已測。 |

研究來源(節錄):pdfmux / themenonlab / CodeCut / Procycons 2025-26 benchmark、PyMuPDF4LLM 官方文件、pdfplumber / Camelot v2 PyPI、RapidOCR GitHub、Docling(arXiv 2501.17887)、WCXB(arXiv 2605.21097)、markitdown #1248。

---

## 5. 本輪已補（從缺口 → 已實作）

- ✅ **掃描 PDF / 圖片型 PDF OCR** — RapidOCR（onnxruntime，無 torch），整頁無文字才自動觸發；`uv sync --extra ocr` 啟用。
- ✅ **PDF 無框線 / 複雜表格** — pdfplumber 文字策略 fallback（過品質閘防誤判），補 fitz 漏抓。
- ✅ **.doc / .odt** — LibreOffice headless 轉 docx 後走全保真路徑；未裝 soffice 明確報錯附指引。

## 6. 仍未竟與路線

1. **多欄 / 複雜學術版面閱讀序** — PyMuPDF 對多欄較弱；必要時路由到 Docling（MIT，重 ML，feature flag）。
2. **掃描表格結構還原** — OCR 目前回純文字行，掃描表格的格狀結構難重建。
3. **DOCX 巢狀表格 / 浮動圖錨點** — 巢狀表格攤平為單層；極少見，待真實案例再補。
4. **AGPL 授權** — 對外商用前需決策:購 PyMuPDF 商業授權，或把 Docling(MIT) 升為主路徑。
5. **圖片檔 OCR / Twitter 線程 / PDF 連結自動下載** — 尚未特化。
