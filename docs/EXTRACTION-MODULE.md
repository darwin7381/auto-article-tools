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
| **.pdf**（數位） | ✅ | PyMuPDF（座標排序） | ✅ | ✅ find_tables→markdown | ✅ | ✅ 依座標插入 | 文字內 | 段落 |
| **.md** | ✅ | 直讀 | ✅ | ✅(下游 md→HTML) | URL | n/a | ✅ | ✅ |
| **.txt** | ✅ | 直讀 | ✅ | — | — | — | — | — |
| **.html/.htm** | ✅ | trafilatura（本機檔） | ✅ | ✅ | URL | 主文順序 | ✅ | ✅ |
| **.rtf** | ✅ | striprtf（純文字） | ✅ | 攤平 | ❌ | — | 純文字 | — |
| **.doc**（舊版 Word） | ⛔ 明確報錯 | 需 LibreOffice 轉檔（未裝） | — | — | — | — | — | — |
| **.odt / .pages** | ⛔ 明確報錯 | 需 LibreOffice | — | — | — | — | — | — |
| **圖片檔**(png/jpg…) | ⛔ 明確報錯 | 需 OCR（未支援） | — | — | — | — | — | — |
| 其他副檔名 | ⛔ 明確報錯 | — | — | — | — | — | — | — |

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
| **PyMuPDF 1.27** | PDF 文字/表格/圖+座標 | **續用（預設）** | 仍是最快、無 ML、原生 PDF→markdown 且文字+表格+圖排序正確的最佳選擇。⚠️ **授權 AGPL-3.0**：若做成對外託管產品需確認合規（或購商業授權）。 |
| **python-docx 1.2** | DOCX 自走抽取 | **續用** | 原生 DOCX 用手走 body 順序是正解（確定性、真順序、表格/圖/連結全可控）；mammoth/docling 不會更強。 |
| **python-markdown** | md→HTML | **續用** | 與抽取正交，無更換理由。 |
| **trafilatura 2.0 + firecrawl** | 網頁/HTML 主文 | **續用** | 仍是文章正文抽取標竿（WCXB F1 0.841）。 |
| **striprtf** | RTF→純文字 | **新增** | 純 Python、無重依賴；RTF 罕見但補齊覆蓋。 |
| OCR（無） | 掃描 PDF/圖片 | **缺口（opt-in 再加）** | 真要做選 PaddleOCR/RapidOCR（表格+CJK 佳）或 Tesseract（最輕）。 |
| 表格重 PDF fallback（無） | 邊角案例 | **可選升級** | Docling（MIT，授權乾淨 + 表格強）做「表格重 PDF」選擇性 fallback，兼當 AGPL 逃生門；惟為重 ML，僅按需路由。 |

研究來源(節錄):pdfmux / themenonlab / CodeCut / Procycons 2025 benchmark、PyMuPDF4LLM 官方文件、Docling(arXiv 2501.17887)、WCXB(arXiv 2605.21097)。

---

## 5. 已知缺口與路線

1. **掃描 PDF / 圖片 OCR** — 目前明確報錯。要支援:opt-in PaddleOCR/RapidOCR，或採 Marker（附帶 Surya OCR）。
2. **.doc / .odt / .pages** — 需 LibreOffice headless（`soffice --convert-to docx`）；環境裝好即可加一條轉檔前置。
3. **表格重 / 多欄 PDF** — PyMuPDF 對無框線表格與多欄版面較弱；必要時路由到 Docling。
4. **DOCX 巢狀表格 / 浮動圖錨點** — 目前巢狀表格攤平為單層;極少見,待真實案例再補。
5. **AGPL 授權** — 對外商用前需決策:購 PyMuPDF 商業授權，或把 Docling(MIT) 升為主路徑。
