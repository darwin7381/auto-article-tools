import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getHealth, listJobs, listWorkflows, type Job } from './api'

const STAGES = [
  ['extract', '進稿抽取', '檔案/URL → 純文字(pymupdf/python-docx/trafilatura)'],
  ['content_ai', 'AI 初步處理', 'contentAgent:標準化/翻譯(讀 DB 生效版)'],
  ['pr_writer', 'PR 潤稿', 'prWriterAgent:潤飾為新聞稿格式'],
  ['format_conversion', '轉 HTML', 'markdown → HTML'],
  ['copy_editing', '上稿參數', 'copyEditorAgent + instructor 結構化(標題/slug/分類/標籤)'],
  ['cover_image', '封面圖', 'gpt-image-2 streaming → Pillow 壓縮 → 落地'],
  ['article_formatting', '進階組稿', '標題正規化/引言/Dropcap/押註/TG+相關閱讀 → 寫回上稿內文'],
]

const SUPERIOR = [
  'Durable job(刷新/斷線/重開不丟,自動接回、並行、可排程)',
  'API + CLI 可程式化(舊版綁死前端)',
  'Prompt / 押註 具名版本管理(切換、回溯)',
  '階段間行級 diff(看 AI 每步改了什麼)',
  '從任一步重跑(可編輯該步輸入)',
  '文件處理免付費(pymupdf/Pillow 取代 ConvertAPI/TinyPNG)',
  'gpt-image-2 streaming(根治長連線被掐斷)',
  'instructor+pydantic 結構化驗證(殺壞 JSON)',
  'Dashboard UI + RWD + 主題 + 全頁拖放',
  '廣告版位視覺化管理(版位地圖 / 規格 / 檔期甘特圖 / 當日預覽 / 狀態看板 + 素材狀態追蹤)',
  '觀測:per-stage 耗時 + token + 結構評分;品質評審 routine 走 Claude subagent(訂閱、不燒 API)+ llm_judge 選用工具',
  '抽取位置保真:PDF 圖/表依座標插回原位(舊版圖片會被丟到頁尾)',
  'DOCX 超連結保真 [text](url)(python-docx .text 預設會丟連結)',
  '進稿格式更廣:docx/pdf/md/txt/html/rtf(舊版上傳只收 pdf/docx)',
  '免付費:PyMuPDF 取代 ConvertAPI(PDF→DOCX 付費轉檔)',
  '自動化測試 pytest 139 通過 / 1 skip(含合成夾具斷言圖片排列位置;skip 需 OCR extra)+ 前端 vitest 59',
]
const PARITY = [
  '進稿全格式(docx 简繁 / pdf 英繁 / md / Google Docs / Medium / WeChat)',
  '文稿類型 + 開頭/結尾押註 + 供稿方替換',
  'copy_editing 上稿參數(title/slug/excerpt/categories/tags)',
  '自動/手動模式 + 5 種發佈狀態',
  '進階組稿(標題正規化/引言/Dropcap/相關閱讀/TG banner)— 本輪補齊',
  'WordPress 發布(含封面上傳媒體庫)',
]
const GAPS: [string, string, string][] = [
  ['🟢 低（暫緩）', '登入 / 權限', '舊版有 Clerk;新版無。已與你確認此項優先級往後放。要時建議用 tunnel 層 Basic Auth(同 dc1/dc2)'],
  ['🟢 低', 'eval 運維化', '結構評分已有;內容品質評審走 subagent(訂閱);待接生產 per-article 結構閘 + metrics 時序儀表板'],
]
// [項目, 方式, 結果/評分, 通過?]
type Row = [string, string, string, boolean]
const E2E_TESTS: Row[] = [
  ['完整 7 階段(數碼港 PDF:4圖+2表 / 新聞稿)', 'job#49 console 從頭跑', '成稿保留 5 圖 1 表(extract 4圖2表;content_ai 丟 1 表→待補)', true],
  ['完整 7 階段(WEEX 简中 docx 含圖 / 廣編稿)', 'job#47 + eval 評分', '11/11 · 137.4s · 简→繁76% · 封面用原文圖', true],
  ['完整 7 階段(HashKey 繁中 docx / 新聞稿)', 'eval CLI', '11/11 · 118.8s · 26k tok', true],
  ['完整流程經 SSE + 從某階段重跑', 'job#46 隔離瀏覽器', '7/7 階段 · 格式化進 wp.content', true],
  ['實際發布到 WordPress 測試站', '隔離瀏覽器 → wp.blocktempo.ai', '草稿+正式皆成功(post 上線,驗後刪)', true],
]
// 格式轉換保真度(最易掉東西的環節)—— 合成夾具斷言排列位置 + 真實素材
const CONV_TESTS: Row[] = [
  ['🔑 DOCX 圖片位置', '合成夾具:前段→圖→後段', 'index(前)<{{IMG0}}<index(後) ✅(非丟頁尾)', true],
  ['🔑 PDF 圖片閱讀順序', '合成夾具:上文→圖→下文', '依座標插回原位 ✅(修掉舊位置 bug)', true],
  ['🔑 DOCX 超連結保真', '合成夾具', '轉 [動區連結](url) ✅(防 .text 丟連結)', true],
  ['DOCX 標題/清單結構', '合成夾具', '# 標題 · - 清單 ✅', true],
  ['DOCX/PDF 有框線表格→markdown', '合成 + 數碼港', '| 表頭 | + | --- | · 真檔 2 表 ✅', true],
  ['🆕 PDF 無框線表格 fallback', '合成夾具(純文字排版無線條)', 'fitz 抓 0 → pdfplumber 補出表 ✅', true],
  ['🆕 掃描/圖片型 PDF OCR(PP-OCRv5)', '合成夾具(圖片內含文字)', 'RapidOCR 辨識補回文字 ✅', true],
  ['🆕 掃描表格 → markdown', '合成夾具(整頁表格影像)', 'OCR+RapidTable 還原表結構 ✅', true],
  ['🆕 掃描 PDF 但 OCR 不可用', '合成夾具(停用 OCR)', '明確報錯,不靜默吐空白給下游 ✅', true],
  ['🆕 多頁掃描檔(帶薄文字層)', '合成夾具(頁尾文字+整頁掃描影像)', '未還原頁佔比過半→報錯,不漏頁靜默過關 ✅', true],
  ['圖片去重(xref)', '合成同圖跨兩頁 + 數碼港', '2頁→1張 · 真檔 8→4 ✅', true],
  ['🆕 .odt 純 Python(odfdo)', '合成夾具(標題/圖/清單/表)', '免 LibreOffice · 圖位/結構保真 ✅', true],
  ['HTML 檔 / RTF 檔', '合成夾具 trafilatura/striprtf', '主文/純文字抽取 ✅', true],
  ['TXT / MD 直通', '合成夾具', '原樣保留 ✅', true],
  ['.doc 轉檔 · 圖片/未知型別報錯', '合成夾具', 'LibreOffice 轉 docx;無則明確報錯帶指引 ✅', true],
  ['md→HTML 表格/figure/程式碼', 'md_to_html', '<table>·<figure>+lazy·<code> ✅', true],
  ['真實素材:HashKey/WEEX/Bluefin', 'extract_document', '繁/简 docx 含圖 · 純文字 PDF ✅', true],
  ['連結:Google Docs/Medium/WeChat', 'export docx / trafilatura+firecrawl', 'gdocs 788/3691字 · Medium 15圖 ✅', true],
  ['死鏈 / 反爬載入失敗', 'Cointelegraph(404) / WeChat2', '明確報錯不帶垃圾跑流程 ✅(預期失敗)', true],
]
// 系統模組總覽:主模組 → 子模組 / 情境設想 / 實現 / 0-99 評分。
// 評分 = 成熟度 × 覆蓋面 × 風險 × 測試覆蓋;抽取模組依賴研究見 docs/EXTRACTION-MODULE.md。
type Leaf = {
  key: string; name: string; score: number; status: string; deps: string; how: string
  scenarios: string[]; strengths: string[]; gaps: string[]; tests: string
}
type MainMod = { key: string; name: string; summary: string; subs: Leaf[] }
const mainScore = (m: MainMod) => Math.round(m.subs.reduce((a, s) => a + s.score, 0) / m.subs.length)

const MAIN_MODULES: MainMod[] = [
  {
    key: 'extract', name: '① 進稿抽取', summary: '把任何進稿(檔案/連結)轉成保真 markdown —— 全流程最易掉東西的一環,做了最深的盤點。',
    subs: [
      {
        key: 'docx', name: 'DOCX 抽取', score: 92, status: '成熟 · 比舊版 mammoth 更保真',
        deps: 'python-docx 1.2(自走 XML，無 ML)',
        how: '依 body 順序走段落/表格交錯;段內按 run/hyperlink 順序，內嵌圖佔位符落在正確段落間;超連結→[text](url)、標題→#、清單→-、表格→markdown。',
        scenarios: ['記者交來的 .docx 新聞稿(內嵌截圖+表格)', '简中稿(WEEX)需翻繁', '含超連結的廣編稿'],
        strengths: ['圖片位置保真(夾在正確段落間)', '超連結保真(.text 預設會丟)', '標題/清單/表格結構保留', '同圖去重'],
        gaps: ['巢狀表格攤平為單層(極少見)'],
        tests: 'test_conversion:圖片位置/超連結/標題清單/表格 + 真實 HashKey、WEEX 素材',
      },
      {
        key: 'pdf', name: 'PDF 抽取', score: 90, status: '強 · 位置保真 + 有框/無框表 + OCR',
        deps: 'PyMuPDF 1.27 + pdfplumber(fallback) + RapidOCR(opt-in)',
        how: '每頁文字塊/表格/圖依座標(上→下,左→右)混排;fitz 漏抓表→pdfplumber 補無框線表(過品質閘);掃描頁→RapidOCR;圖片 xref 全域去重。',
        scenarios: ['品牌方 PDF 新聞稿(數碼港:多圖多表)', '英文純文字 PDF', '掃描/影印 PDF', '無框線排版的數據表'],
        strengths: ['圖/表依閱讀順序插回原位(修舊版丟頁尾 bug)', '有框線表(fitz)+無框線表(pdfplumber)', '掃描 PDF OCR', '圖片去重'],
        gaps: ['多欄/複雜學術版面閱讀序', '⚠️ PyMuPDF AGPL—商用需確認授權'],
        tests: 'test_conversion:閱讀順序/去重/無框線表/掃描守門 + 真實 Bluefin、數碼港',
      },
      {
        key: 'url', name: '網頁 / URL 抽取', score: 86, status: '強 · 正文抽取標竿 + 反爬 fallback',
        deps: 'trafilatura 2.0 + firecrawl CLI',
        how: 'Google Docs→export docx 走 docx 路徑;Medium/WeChat/一般站→直抓+trafilatura;被擋/殼頁→firecrawl 渲染後重抽;抽取<150字→明確報錯。',
        scenarios: ['Google Docs 共筆稿', 'Medium/WeChat 文章轉載', '反爬/JS 渲染站', '死鏈/被刪文'],
        strengths: ['主文抽取標竿(WCXB F1 0.84)', '反爬/JS 渲染 fallback', 'gdocs 含圖嵌入', '死鏈明確報錯'],
        gaps: ['Twitter/X 線程未特化', 'PDF 連結未自動下載抽取'],
        tests: 'test_ingest:gdoc/webpage 派發、firecrawl fallback、404 不 fallback、死鏈守門、ingest 圖嵌入(mock 網路) + 真實連結人工實測',
      },
      {
        key: 'misc', name: 'HTML / RTF / 純文字檔', score: 80, status: '齊全 · 涵蓋常見離線格式',
        deps: 'trafilatura(html) + striprtf(rtf)',
        how: '本機 .html/.htm→trafilatura 主文;.rtf→striprtf 純文字;.md/.txt→直讀原樣保留。',
        scenarios: ['存成 .html 的文章', '少見的 .rtf 稿', '貼純文字 .txt / .md'],
        strengths: ['HTML 主文抽取(同 URL 路徑)', 'RTF 純 Python 無重依賴', 'md/txt 原樣直通'],
        gaps: ['RTF 攤平、無圖/表結構(研究確認無維護中純 Python 替代)', '本機 HTML 相對圖路徑可能失效'],
        tests: 'test_conversion:test_html_file / test_rtf_file / test_txt_and_md',
      },
      {
        key: 'ocr', name: 'OCR(掃描 / 圖片型 PDF)', score: 86, status: '升級 · PP-OCRv5 + 掃描表格結構',
        deps: 'rapidocr(PP-OCRv5，無 torch) + rapid_table',
        how: '判定掃描頁=「大圖佔版面過半且文字稀少」→200dpi render→RapidOCR(PP-OCRv5);RapidTable 還原表格→HTML→過閘→markdown。引擎惰性載入。',
        scenarios: ['整頁掃描/影印的 PDF', '圖片型(無文字層)PDF', '掃描的數據表'],
        strengths: ['PP-OCRv5:CJK 含繁中一級支援', 'onnxruntime 輕量(無 torch/GPU)', 'RapidTable 還原掃描表結構', 'OCR 救不回/漏頁過半→明確報錯'],
        gaps: ['需 `uv sync --extra ocr` 啟用', '首跑下載模型 ~數十 MB', '手寫/公式需 VLM(離線跑)'],
        tests: 'test_conversion:OCR 辨識 / 掃描表→markdown / OCR 不可用報錯 / 多頁守門',
      },
      {
        key: 'legacy', name: '.doc / .odt 舊格式', score: 80, status: '.odt 純 Python 全保真 · .doc 需 LibreOffice',
        deps: 'odfdo(.odt，純 Python) + LibreOffice headless(.doc)',
        how: '.odt→odfdo 走 body 順序(標題/段落/清單/表/圖保位)，免 LibreOffice;.doc(無純 Python 路徑)→LibreOffice 轉 docx;未裝 soffice→明確報錯。',
        scenarios: ['舊 .doc 二進位稿', 'OpenOffice/LibreOffice .odt'],
        strengths: ['.odt 免 LibreOffice、與 DOCX 同級保真', '.doc 轉檔後全保真', 'odfdo 為最佳維護中純 Python ODF 庫', '逾時/失敗明確報錯'],
        gaps: ['.doc 仍需系統裝 LibreOffice(本機尚未裝)', '.doc 轉檔額外耗時(可換 unoserver 常駐)'],
        tests: 'test_conversion:test_odt_pure_python(含超連結/多段清單)、test_legacy_doc_rejected',
      },
      {
        key: 'md2html', name: 'markdown → HTML', score: 90, status: '成熟 · 與舊版 marked 對等',
        deps: 'python-markdown(extra/tables/fenced_code…)',
        how: 'GFM 轉換;<p><img></p>→<figure class="article-image">+lazy(復刻舊版);表格/程式碼/清單完整。',
        scenarios: ['抽取後的 markdown 內文轉上稿 HTML', '含表格/圖/程式碼區塊'],
        strengths: ['表格 <table> 渲染', '圖片 figure 包裝 + lazy', '程式碼區塊', '與舊版 marked 對等'],
        gaps: ['複雜 HTML 內嵌(iframe/embed)未特化'],
        tests: 'test_conversion:表格 / figure+lazy / fenced_code',
      },
    ],
  },
  {
    key: 'ai', name: '② AI 內容處理', summary: '三個 LLM agent:標準化/翻譯 → 新聞稿潤飾 → 結構化上稿參數。設定讀 DB 生效版,可版本回溯。',
    subs: [
      {
        key: 'content', name: 'contentAgent(標準化/翻譯)', score: 80, status: '可用 · eval 把關,有已知 AI 端漏失',
        deps: 'gemini-2.5-pro(openrouter)',
        how: '讀 DB 生效版 prompt;把原文標準化、简→繁;非串流(等待中無子進度)。',
        scenarios: ['简→繁轉換', '行銷/口語語氣標準化', '去除原文雜訊/頁尾'],
        strengths: ['prompt 讀 DB 版本化', '简→繁(job#47 實測 76% 繁中)', '繁中比例 eval 把關'],
        gaps: ['偶爾丟失原文表格(已證實為 AI 端,非抽取)', '非串流→等待中無子進度'],
        tests: 'eval scorecard 繁中比例 + E2E job#47(11/11);逐階段追蹤證實表格漏失在此階段',
      },
      {
        key: 'pr', name: 'prWriterAgent(PR 潤稿)', score: 82, status: '可用 · 潤飾成新聞稿語氣',
        deps: 'gemini-2.5-pro(openrouter)',
        how: '把標準化內文潤飾為 BlockTempo 新聞稿格式;補導言/結構;讀 DB 生效版 prompt。',
        scenarios: ['品牌新聞稿語氣統一', '補導言與段落結構'],
        strengths: ['讀 DB 版本化 prompt', 'E2E 跑通(job#47/#49)'],
        gaps: ['潤飾品質靠開發時 subagent 評審(非自動)', '非串流'],
        tests: 'E2E pipeline(job#47/#49)結構不變式;品質目前人工審',
      },
      {
        key: 'copy', name: 'copyEditorAgent(結構化上稿參數)', score: 84, status: '強 · 結構化驗證殺壞 JSON',
        deps: 'instructor + pydantic',
        how: 'create_with_completion 強制結構化輸出(title/slug/excerpt/categories/tags);壞 JSON 自動重試。',
        scenarios: ['抽 title/slug/excerpt', '產生英文 slug', '對應分類/標籤'],
        strengths: ['structured output 驗證(殺壞 JSON)', 'slug/分類/標籤齊全(eval 檢查)', '英文 slug 規則'],
        gaps: ['分類/標籤 ID 對應正確性需人工確認'],
        tests: 'eval scorecard:有標題/英文slug/分類/標籤/摘要 全綠',
      },
    ],
  },
  {
    key: 'cover', name: '③ 封面圖生成', summary: '有原文配圖優先用首圖(省成本),否則 gpt-image-2 streaming 生成 → 本地壓縮落地。',
    subs: [
      {
        key: 'cover', name: '封面圖生成', score: 82, status: '可用 · streaming 根治長連線斷',
        deps: 'gpt-image-2 streaming + Pillow',
        how: 'D3:有原文配圖→用首圖當特色圖;否則 gpt-image-2 streaming 生成→Pillow 壓 JPEG→落地、回可公開 URL;失敗不擋整條流程。',
        scenarios: ['新聞稿無配圖 → AI 生成封面', '廣編稿有官方圖 → 用原圖', '大圖長連線被網路中介掐斷'],
        strengths: ['streaming 根治 ~180s 斷線', 'Pillow 本地壓縮省 84%', '原文首圖優先省成本', '封面失敗不擋流程'],
        gaps: ['封面構圖/alt 品質未自動評分', '生成模型為外部付費 API'],
        tests: 'test_compress_cover(Pillow 壓縮:更小+仍有效影像);streaming 單獨重現(183s斷→72s成功)',
      },
    ],
  },
  {
    key: 'format', name: '④ 進階組稿', summary: '套 BlockTempo 上稿規範:標題正規化/引言/Dropcap/頁首尾押註/TG banner+相關閱讀 → 寫回上稿內文。',
    subs: [
      {
        key: 'format', name: '進階組稿', score: 88, status: '成熟 · 與舊版對等、六項全測',
        deps: 'formatting.py(自製，復刻舊 ArticleFormattingProcessor)',
        how: '標題層級正規化、用摘要生成 intro_quote、首字 Dropcap、頁首/頁尾免責(版本>內建)、TG banner+相關閱讀、供稿方名稱替換 → 寫回 wp.content。',
        scenarios: ['廣編稿需頭尾免責聲明', '新聞稿首字放大+導言', '文末 TG 官方橫幅+相關報導', '供稿方名稱自動替換'],
        strengths: ['六項組稿全綠(test_format_article_full)', '與舊版對等', '押註 3-tier 解析', '開關可逐項關閉'],
        gaps: ['相關閱讀為預設連結,需審稿時替換'],
        tests: 'test_format_article_full:h2→h3/引言/押註位置/dropcap/TG/廣編紅連結/全關',
      },
    ],
  },
  {
    key: 'job', name: '⑤ 任務系統', summary: '本平台最穩的一塊:durable 佇列,刷新/斷線/重開不丟、自動接回、並行、可從任一階段重跑。',
    subs: [
      {
        key: 'job', name: '任務系統(durable queue)', score: 90, status: '強 · 本平台標竿',
        deps: 'FastAPI + SQLModel(SQLite WAL) + asyncio worker + sse-starlette',
        how: 'durable 佇列(in-process worker + Semaphore);SSE 即時逐階段 + 2s slim poll 保底;狀態落 DB,可從任一階段(編輯輸入後)重跑;API+CLI 共用同一 runner。',
        scenarios: ['長流程中重整/斷線/重開', '多任務並行', '從某階段編輯後重跑', 'tunnel 壅塞逾時自癒'],
        strengths: ['durable(刷新/斷線/重開不丟、自動接回)', 'SSE 重播測試', '並行 + 可排程', 'API+CLI 可程式化'],
        gaps: ['單機 in-process(未做多機分散式)'],
        tests: 'test_api:job 生命週期 / SSE 重播 / 未知 workflow 404 / health',
      },
    ],
  },
  {
    key: 'config', name: '⑥ 設定 / 版本管理', summary: 'Agent 設定 + Prompt/押註 具名版本(切換/回溯/刪除);押註兩層解析:具名版本 > 內建預設。',
    subs: [
      {
        key: 'agentcfg', name: 'Agent 設定', score: 85, status: '可用 · prompt/model/溫度可調',
        deps: 'agent_config.py + agents API(取代舊 R2 後台)',
        how: '每個 agent 的 provider/model/system+user prompt/溫度/max_tokens 讀自 DB 生效版;agents API 線上編輯/重置 seed。',
        scenarios: ['調 prompt 措辭', '換 model / provider', '調溫度控發散', '重置回 seed 預設'],
        strengths: ['設定即時生效', 'API 可程式化讀寫', 'overlay(版本覆蓋 base)有測'],
        gaps: ['無 A/B 對照跑'],
        tests: 'test_config:overlay + agents API list/get/update/404;reset 404',
      },
      {
        key: 'version', name: 'Prompt / 押註 版本', score: 86, status: '強 · 生命週期全測',
        deps: 'versions.py',
        how: '具名儲存 prompt/押註 組合;建立 / 切換生效 / 回溯 / 刪除;押註解析「版本 > 內建」兩層;上方顯示目前生效版本。',
        scenarios: ['存多套 prompt 組合', '一鍵切換/回退', '刪除過時組合', '押註用版本覆蓋內建'],
        strengths: ['切換/回退/刪除全綠', '避免覆蓋即失去舊版', '押註 版本>內建 有測'],
        gaps: ['版本 diff 視覺化可再加'],
        tests: 'test_config_version_lifecycle + activate/delete API/404 + 押註 版本>內建',
      },
    ],
  },
  {
    key: 'publish', name: '⑦ WordPress 發布', summary: '上傳封面到媒體庫 → 建文章(5 種發佈狀態);自動/手動模式。',
    subs: [
      {
        key: 'publish', name: 'WordPress 發布', score: 82, status: '可用 · 實站驗證(草稿+正式)',
        deps: 'wordpress.py(WP REST API)',
        how: '把封面上傳到 WP 媒體庫取 media id → 建文章(title/content/excerpt/slug/分類/標籤/特色圖);支援 draft/pending/publish/private/future;自動模式跑完直接發。',
        scenarios: ['草稿給編輯審', '直接發佈上線', '定時發佈', '私人/待審'],
        strengths: ['實測發到 wp.blocktempo.ai(草稿+正式皆成功,驗後刪)', '封面進媒體庫', '5 種發佈狀態'],
        gaps: ['無自動 pytest(需 live WP 站)', '無失敗重試/發布佇列'],
        tests: '隔離瀏覽器 → wp.blocktempo.ai 實際發布(草稿+正式,post 上線驗後刪)',
      },
    ],
  },
  {
    key: 'obs', name: '⑧ 觀測 / 評測', summary: '專案內:per-stage 耗時+token + 結構不變式回歸評分(零成本決定論)。內容品質評審 routine 走 Claude subagent(訂閱、不燒 API);llm_judge 留作選用開發工具(非生產)。',
    subs: [
      {
        key: 'obs', name: '觀測 / 評測', score: 80, status: '結構評分+telemetry 已測 · 品質評審 subagent(訂閱)+ llm_judge 選用工具 · 待運維化',
        deps: 'evals.py(結構評分 + llm_judge 選用工具)+ contextvar(token)+ evals/ subagent(訂閱)',
        how: '① 專案內:11 條結構不變式 + 繁中比例 + per-stage 耗時/token,零成本決定論。② 內容品質(忠實/丟內容/幻覺/翻譯):routine 走 evals/ 的 Claude subagent(訂閱、不燒 API);另保留 llm_judge 選用開發工具(CLI --judge,明確 opt-in 才跑、會用 key、非生產)。界線:生產端用 key 的只有 pipeline 那幾隻 agent。',
        scenarios: ['prompt/流程改動後跑結構回歸', '抓 AI 端丟內容 → routine 用 subagent content-faithfulness;或 opt-in --judge', '看每步耗時/tokens 找瓶頸'],
        strengths: ['結構不變式 11 條 + 繁中比例(test 背書)', 'per-stage 耗時 + token(contextvar)', '品質評審 routine 走 subagent(訂閱不燒 API、可並行、紀錄入 evals/)', 'llm_judge 選用工具留在專案(test_llm_judge 背書),但不融入生產 pipeline'],
        gaps: ['score_result 只在 CLI/dev,未接生產 per-article 結構閘', 'metrics 未聚合、無時序儀表板、無告警', 'token 捕捉靜默失敗(provider 沒回 usage→0)', '品質評審非自動(人工觸發)'],
        tests: 'test_eval_scorecard(結構)+ test_llm_judge(選用工具 mock LLM、不打網路)',
      },
    ],
  },
  {
    key: 'ui', name: '⑨ 前端 Dashboard', summary: 'Vite+React+TS SPA:真路由/深連結、可收合側邊欄、SSE 即時、RWD、主題、全頁拖放。',
    subs: [
      {
        key: 'ui', name: '前端 Dashboard', score: 84, status: '強 · 本輪補真路由+可收合側邊欄',
        deps: 'Vite + React + TS + react-router',
        how: 'SPA 真路由(每頁獨立網址 / 深連結 / 上一頁,後端 SPA fallback);可收合側邊欄(記憶);SSE 即時逐階段;localStorage 偏好;全頁拖放;index.html no-cache 防快取毒瘤。',
        scenarios: ['桌面 + 手機操作', '分享某 job 連結(/?job=ID)', '重整保留進度', '暗/亮主題切換'],
        strengths: ['真路由 + 深連結 + 上一頁(本輪)', '可收合側邊欄(本輪)', 'RWD(隔離瀏覽器:桌面 1440 + 390 手機驗)', '快取毒瘤已修'],
        gaps: ['深層整合測試(RunPanel 完整狀態機 attach/SSE/poll)待補', 'bundle ~870KB 未 code-split'],
        tests: '隔離瀏覽器經 tunnel:路由/深連結/側邊欄收合/RWD/拖放/主題/0 console 錯誤',
      },
    ],
  },
]
const UNIT_TESTS: Row[] = [
  ['後端自動化測試 pytest', 'uv run pytest', '139 通過 / 1 skip(OCR extra)', true],
  ['前端自動化測試 vitest', 'pnpm test(jsdom+RTL)', '59 通過(路由/子導覽/看板三視圖/上傳/保真守門/XSS/進度估算/safeUrl/廣告版位地圖/檔期解析/狀態看板)', true],
  ['進階組稿六項(正規化/引言/押註位置/dropcap/TG/紅連結)', 'test_format_article_full', '通過', true],
  ['D1 內嵌圖片抽取', 'ingest 實跑 HashKey docx', '抽到 1 圖 ✅', true],
  ['D2 圖片 figure 包裝 + lazy', 'test_md_to_html_figure_wrap', '通過', true],
  ['eval 評分器(結構不變式 + 繁中比例)', 'test_eval_scorecard', '通過', true],
  ['版本管理生命週期(建立/切換/刪除/回退)', 'test_config_version_lifecycle', '通過', true],
  ['durable job 端到端 + SSE 重播 + 404', 'test_api', '通過', true],
  ['影像 gpt-image-2 streaming + Pillow 壓縮', '單獨重現(183s 斷→72s 成功)', '通過 · 省 84%', true],
  ['前端 dashboard / RWD / 拖放 / 主題 / 快取', '隔離瀏覽器(桌面 1440 + 390 手機)', '無溢出 ✅', true],
]

// Subagent 獨立稽核(走訂閱、不燒 API;輔助佐證,不覆寫上方模組分數)。
// 紀錄:evals/records/2026-06-21-module-capability-auditor-batch.md;角色:evals/agents/
// audit1 = 第一輪(補測前);audit = 第三輪(三輪補測後最終獨立稽核分)。
const AUDITS: { mod: string; owner: number; audit1: number; audit: number; finding: string }[] = [
  { mod: '進稿抽取', owner: 86, audit1: 84, audit: 84, finding: '剩 .doc 成功路徑(需系統 LibreOffice,已 skip-test)、多欄 PDF' },
  { mod: 'AI 內容處理', owner: 82, audit1: 32, audit: 78, finding: '剩 完整 7 階段整合鏈、chat 429/耗盡分支' },
  { mod: '封面圖生成', owner: 82, audit1: 58, audit: 81, finding: '剩 retry 耗盡訊息、APITimeout/InternalServerError 分支' },
  { mod: '進階組稿', owner: 88, audit1: 58, audit: 88, finding: '剩 dropcap 特殊字元 guard、stage formatting 開關、HTML 跳脫' },
  { mod: '任務系統', owner: 90, audit1: 58, audit: 80, finding: '剩 SSE live tail/去重、真實併發限流實證' },
  { mod: '設定 / 版本', owner: 86, audit1: 38, audit: 79, finding: '剩 delete-active 自動接棒(API 層)、agents reset 成功路徑(需 seed)' },
  { mod: 'WordPress 發布', owner: 82, audit1: 41, audit: 80, finding: '剩 502 失敗分支、媒體 from-path 分支、真實 _auth' },
  { mod: '觀測 / 評測', owner: 80, audit1: 64, audit: 80, finding: '剩 多階段 token 加總、chat/structured 真實 usage 抽取' },
  { mod: '前端 Dashboard', owner: 84, audit1: 83, audit: 88, finding: '剩 RunPanel 完整狀態機(attach/SSE/poll 合併)整合測試' },
]

function AuditsPanel() {
  return (
    <div className="panel">
      <h2>🔬 Subagent 獨立稽核（走訂閱,不燒 API）</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        獨立 Claude subagent(<code>module-capability-auditor</code>)讀程式碼+測試評分,偏重「自動化測試覆蓋」故較嚴。
        <b>第一輪</b>發現多模組缺單元測試 → <b>分輪補測至 pytest 48→139 + 前端 59 vitest</b> → 稽核分全面回升至 78–88。
        欄位:稽核①=補測前、稽核③=最終。<b>輔助佐證,不覆寫上方模組分數。</b>紀錄 <code>evals/records/2026-06-21-…</code>。
      </p>
      <div className="table-wrap"><table>
        <thead><tr><th>模組</th><th>維護者分</th><th>稽核①</th><th>稽核③(最終)</th><th>仍待補(較深路徑)</th></tr></thead>
        <tbody>{AUDITS.map((a) => (
          <tr key={a.mod}>
            <td>{a.mod}</td>
            <td><b style={{ color: scoreColor(a.owner) }}>{a.owner}</b></td>
            <td className="muted">{a.audit1}</td>
            <td><b style={{ color: scoreColor(a.audit) }}>{a.audit}</b>{a.audit > a.audit1 ? <span style={{ color: 'var(--accent)', fontSize: 11 }}> ↑{a.audit - a.audit1}</span> : null}</td>
            <td className="muted">{a.finding}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="hint">
        另有 <code>content-faithfulness</code> 評審角色(比對原文 vs 成稿,抓丟內容/幻覺):需真實 article「原文+成稿」配對才跑,尚未執行。
        仍待補的多為最深層整合/邊角分支(完整 7 階段鏈、SSE live、RunPanel 狀態機;見紀錄)。
      </p>
    </div>
  )
}

function useLiveStats() {
  const [live, setLive] = useState<{ health: boolean; wf: number; jobs: number; done: number }>(
    { health: false, wf: 0, jobs: 0, done: 0 })
  useEffect(() => {
    (async () => {
      const [h, w, j] = await Promise.all([
        getHealth().then(() => true).catch(() => false),
        listWorkflows().then((x) => x.length).catch(() => 0),
        listJobs().catch(() => [] as Job[]),
      ])
      setLive({ health: h, wf: w, jobs: j.length, done: j.filter((x) => x.status === 'done').length })
    })()
  }, [])
  return live
}

function StatCards() {
  const live = useLiveStats()
  return (
    <div className="stat-cards">
      <Stat label="後端" value={live.health ? '運行中' : '未連線'} ok={live.health} />
      <Stat label="Workflows" value={String(live.wf)} />
      <Stat label="Jobs 總數" value={String(live.jobs)} />
      <Stat label="完成 Jobs" value={String(live.done)} />
      <Stat label="後端測試" value="139 ✓" ok />
      <Stat label="前端測試" value="59 ✓" ok />
    </div>
  )
}

/** /status — 總覽 */
export function StatusOverview() {
  return (
    <div className="status-page">
      <StatCards />
      <div className="panel">
        <h2>三大區塊(左側可展開直接點)</h2>
        <div className="area-cards">
          <div className="area-card"><b>🧩 模組搭建與測試</b><span>9 大系統模組的成熟度評分、subagent 獨立稽核、單項測試</span></div>
          <div className="area-card"><b>📄 稿件處理</b><span>7 階段 AI pipeline、E2E 全流程測試、格式轉換保真度測試</span></div>
          <div className="area-card"><b>📋 看板與協作</b><span>Delivery 跨部門業務線看板、三視圖/分組/篩選、合約額度、即時協作測試</span></div>
          <div className="area-card"><b>📖 使用說明 / API</b><span>網頁操作、CLI 用法、完整 REST API 文件</span></div>
        </div>
      </div>
      <div className="grid">
        <div className="panel">
          <h2>✅ 新版超越舊版</h2>
          <ul className="tick">{SUPERIOR.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="panel">
          <h2>⚖️ 與舊版對等</h2>
          <ul className="tick eq">{PARITY.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <div className="panel">
        <h2>🚧 還差的(缺口,依優先序)</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>優先</th><th>項目</th><th>說明</th></tr></thead>
          <tbody>{GAPS.map(([sev, item, desc]) => (
            <tr key={item}><td style={{ whiteSpace: 'nowrap' }}>{sev}</td><td><b>{item}</b></td><td className="muted">{desc}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="hint">完整逐行比對見 repo <code>docs/OLD-VS-NEW.md</code>。</p>
      </div>
    </div>
  )
}

/** /status/modules — 模組搭建與測試 */
export function StatusModules() {
  return (
    <div className="status-page">
      <ModulesPanel />
      <AuditsPanel />
      <div className="panel">
        <h2>🔬 單項測試（unit / 元件）</h2>
        <TestTable rows={UNIT_TESTS} />
        <p className="hint">後端 <code>uv run pytest</code> 139 通過 / 1 skip;前端 <code>pnpm test</code> 43 通過,並以隔離瀏覽器經 tunnel 實測。</p>
      </div>
    </div>
  )
}

/** /status/article — 稿件處理 */
export function StatusArticle() {
  return (
    <div className="status-page">
      <div className="panel">
        <h2>處理流程(7 階段 pipeline)</h2>
        <div className="flow">
          {STAGES.map(([id, name, desc], i) => (
            <div key={id} className="flow-step">
              <div className="flow-num">{i + 1}</div>
              <div className="flow-body"><b>{name}</b><code>{id}</code><i>{desc}</i></div>
              {i < STAGES.length - 1 && <span className="flow-arrow">↓</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>🧪 完整流程測試（E2E,跑整條 pipeline）</h2>
        <TestTable rows={E2E_TESTS} />
        <p className="hint">最近一次完整重跑:job#61(看板觸發 AI 轉稿,7 階段跑完自動移待發佈)。</p>
      </div>
      <div className="panel">
        <h2>🔧 格式轉換保真度測試（最易掉東西的環節 — 合成夾具斷言排列位置 + 真實素材）</h2>
        <TestTable rows={CONV_TESTS} />
        <p className="hint">🔑 = 用程式即時造夾具,精準斷言「圖片/文字的排列位置」(肉眼難查)。後端 <code>tests/test_conversion.py</code>;模組覆蓋面/指標/依賴審計見 <code>docs/EXTRACTION-MODULE.md</code>。</p>
      </div>
    </div>
  )
}

// 看板與協作:pipeline / 功能 / 測試
const BOARD_PIPELINES: [string, string, string][] = [
  ['A', '廣編稿 / 官網快訊 / 新聞稿', '接稿 → 審稿 → AI 轉稿(bd-pr)→ WordPress 草稿 → 編輯審+發官網 → 社群推播 → 回傳'],
  ['B', '軟文(常規 / 專訪 / 深度)', '登錄需求 → 主審撰稿 → 客戶過稿 → 排程 → 發官網 → 社群 → 回傳'],
  ['C', 'Banner', '整理規格 → 通知 Joe 上架 → 驗證回傳 → 追下架日 → 下架 → 登錄'],
]
const BOARD_FEATURES = [
  '三視圖:看板(可拖拉)/ 清單(分組可收合)/ 表格(可排序)',
  'Group by 10 維:階段 / Pipeline / 品項 / 客戶 / DM / BD / 主審 / 優先級 / 合約 / 不分組',
  'Filter:搜尋 + Pipeline / 品項 / 客戶 / DM / 主審 / 合約 + 只看逾期',
  '合約=額度容器:6 品項額度,稿件結案自動扣抵,剩餘量顯示在卡片/合約頁(新聞稿不扣)',
  '品項自動帶 pipeline 與押註參數(廣編→sponsored、新聞稿→press-release…)',
  'bd-pr AI 轉稿連動:卡片直接觸發,job 跑時卡上即時管線進度,完成自動移「待發佈」',
  '通知雙線(留接口):到「待發佈」自動通知主審審稿;一鍵通知 BD 回傳客戶',
  '即時協作:看板 SSE 多人同步(建卡/移卡/留言),留言開著抽屜即時顯示',
  '發佈連結回填(官網/TG/FB/X/LINE)、留言、活動時間軸、通知紀錄',
  '舊版看板啟動自動遷移成 Delivery 設計(冪等,不崩潰、保留卡片)',
]
const BOARD_TESTS: Row[] = [
  ['seed 八階段 + meta(品項/額度/角色)', 'test_board_seeded_with_delivery_stages', '通過', true],
  ['品項自動帶 pipeline / 押註', 'test_item_type_derives_pipeline_and_disclaimer', '通過', true],
  ['合約額度 + 結案自動扣抵', 'test_contract_quota_and_billing_on_done', '通過', true],
  ['新聞稿不扣額度', 'test_news_release_not_billable', '通過', true],
  ['移卡 / 留言 / 刪除 + 活動軸', 'test_move_comment_delete_with_activity', '通過', true],
  ['發佈連結回填 + 通知 BD', 'test_published_urls_and_notify_bd', '通過', true],
  ['觸發轉稿需來源 + 掛 job', 'test_run_requires_source_and_links_job', '通過', true],
  ['job 完成自動移待發佈 + 通知編輯', 'test_sync_moves_to_publish_and_notifies_editor', '通過', true],
  ['舊版看板自動遷移 Delivery', 'test_migrate_legacy_board_to_delivery', '通過', true],
  ['前端:三視圖 / 分組 / 篩選 / 建卡', 'board.test.tsx(vitest)', '5 通過', true],
  ['即時協作:他人留言即時顯示', '隔離瀏覽器(API 注入他人留言)', '無重整即現 ✅', true],
  ['E2E:建卡→AI轉稿→自動移待發佈→通知編輯', '隔離瀏覽器 job#61', '7 階段 · 自動移欄 ✅', true],
]

/** /status/board — 看板與協作 */
export function StatusBoard() {
  return (
    <div className="status-page">
      <div className="panel">
        <h2>📋 Delivery 跨部門業務線看板</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          取代 Notion 兩張進度表 + Google Sheet 合約額度,把整條 Delivery(業務稿處理)搬進平台:
          BD 談案 → DM 串接 → 主審 → 上稿 → 社群推播 → 回傳客戶 → 扣合約額度。設計依據
          <code>auto-bd-sys-v1/Delivery_操作手冊</code>,對照 <code>docs/DELIVERY-BOARD.md</code>。
          文章自動化(bd-pr)只是 Pipeline A 的「AI 轉稿」一步。
        </p>
        <div className="table-wrap"><table>
          <thead><tr><th>Pipeline</th><th>品項</th><th>流向</th></tr></thead>
          <tbody>{BOARD_PIPELINES.map(([p, items, flow]) => (
            <tr key={p}><td><b>{p}</b></td><td>{items}</td><td className="muted">{flow}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      <div className="panel">
        <h2>✅ 功能(正規 kanban 產品)</h2>
        <ul className="tick">{BOARD_FEATURES.map((s) => <li key={s}>{s}</li>)}</ul>
      </div>
      <div className="panel">
        <h2>🧪 看板與協作測試</h2>
        <TestTable rows={BOARD_TESTS} />
        <p className="hint">後端 <code>tests/test_board.py</code> 9 項 + 前端 <code>board.test.tsx</code> 5 項 + 隔離瀏覽器 E2E。</p>
      </div>
    </div>
  )
}

// ════════════════ 使用說明文件 ════════════════
function Doc({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="panel doc-sec"><h2>{title}</h2>{children}</section>
}
function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(children).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1300) }).catch(() => {})
  }
  return (
    <div className="code-block">
      <div className="code-bar"><span className="code-lang">{lang || 'shell'}</span>
        <button className="code-copy" onClick={copy}>{copied ? '✓ 已複製' : '複製'}</button></div>
      <pre className="doc-code">{children}</pre>
    </div>
  )
}
function Method({ m }: { m: string }) {
  return <>{m.split('/').map((x, i) => <span key={x} className={`api-m m-${x.toLowerCase()}`}>{i > 0 ? ' ' : ''}{x}</span>)}</>
}

const DOC_TOC: [string, string][] = [
  ['intro', '平台簡介'], ['quickstart', '快速開始'], ['concepts', '核心概念'],
  ['web', '網頁操作'], ['placements', '廣告版位'], ['cli', 'CLI 用法'], ['api', 'REST API'], ['deploy', '部署 / 維運'],
]
const API_GROUPS: { group: string; rows: [string, string, string][] }[] = [
  {
    group: '稿件處理(Job / Workflow)',
    rows: [
      ['GET', '/health', '健康檢查 + 可用 workflow 列表'],
      ['GET', '/workflows', '列出所有 workflow(article / echo / extract / standardize)'],
      ['POST', '/jobs', '建立並排入 job:body {workflow, input, from_stage?} → {id, status}'],
      ['GET', '/jobs?limit=50', '列出近期 job(輕量,不含完整結果)'],
      ['GET', '/jobs/{id}?full=true', '取單一 job;full=true 含逐階段輸出,false 為輕量輪詢'],
      ['GET', '/jobs/{id}/stream', 'SSE 即時進度(先重播歷史事件再接 live;event: stage/done/error)'],
      ['POST', '/uploads', 'multipart 上傳檔案(欄位 file)→ {file:"data/uploads/…"}'],
      ['POST', '/publish', '發布 job 結果到 WordPress:{job_id, status:"draft"|"publish", overrides?}'],
      ['GET', '/templates/builtin', '內建文稿類型 / 押註範本'],
    ],
  },
  {
    group: '設定 / 版本',
    rows: [
      ['GET PUT', '/agents/{name}', 'Agent 設定讀取 / 更新(provider/model/prompt/temperature…)'],
      ['POST', '/agents/{name}/reset', '重置該 agent 回 seed 預設'],
      ['GET POST', '/versions/{scope}', 'Prompt / 押註的具名版本(scope 如 agent:contentAgent)'],
      ['POST', '/versions/{scope}/{id}/activate', '切換生效版本'],
    ],
  },
  {
    group: 'Delivery 看板',
    rows: [
      ['GET', '/board', '整板快照:{columns, tasks, contracts, meta}'],
      ['POST', '/board/tasks', '建稿件卡(填 item_type 自動帶 pipeline/押註)'],
      ['PATCH DELETE', '/board/tasks/{id}', '編輯 / 移欄(column_id+position)/ 刪除'],
      ['GET', '/board/tasks/{id}', '稿件詳情(含 comments / activity / notifications)'],
      ['POST', '/board/tasks/{id}/run', '觸發 bd-pr AI 轉稿(建 job + 掛上 + 移「製作中」)'],
      ['POST', '/board/tasks/{id}/comments', '留言:{body, author}'],
      ['POST', '/board/tasks/{id}/urls', '回填發佈連結:{urls:{website,tg,fb,x,line}}'],
      ['POST', '/board/tasks/{id}/notify-bd', '通知 BD 回傳客戶'],
      ['GET POST', '/board/contracts', '列出 / 新增合約(含各品項額度)'],
      ['PATCH DELETE', '/board/contracts/{id}', '更新 / 刪除合約'],
      ['POST', '/board/columns', '新增欄位(階段)'],
      ['PATCH DELETE', '/board/columns/{id}', '更新 / 刪除欄位'],
      ['GET', '/board/stream', '看板即時 SSE(task.created/updated/deleted、comment.added、column.changed)'],
    ],
  },
]

/** /status/docs — 使用說明文件 */
export function StatusDocs() {
  return (
    <div className="docs-layout">
      <div className="docs-main status-page doc-page">
        <Doc id="intro" title="平台簡介">
          <p><b>BlockTempo BD 內容自動化平台</b>——把「客戶稿件從談進來到上線結案」整條業務線自動化,
            並用一個<b>跨部門 Delivery 看板</b>管理全流程進度。後端 FastAPI(Python / SQLite),
            前端 Vite + React + TypeScript,後端同源托管前端,一條 tunnel 即可使用、免 CORS。</p>
          <div className="doc-callout">
            <b>兩個入口</b>
            <ul className="tick">
              <li><b>部門看板</b>(/kanban):跨部門業務線的工作管理 —— 三條 pipeline、合約額度、協作。</li>
              <li><b>處理稿件</b>(/):單篇稿件的 7 階段 AI 流程 —— 上傳/貼連結 → AI 轉稿 → 審稿 → 發布。看板的「AI 轉稿」其實就是呼叫這條。</li>
            </ul>
          </div>
        </Doc>

        <Doc id="quickstart" title="快速開始">
          <h3>情境 A:我有一篇客戶廣編稿要上</h3>
          <ol className="doc-ol">
            <li>到<b>部門看板</b> →「＋ 新增稿件」→ 填客戶、品項選「廣編稿」、指定 DM/主審、綁合約。</li>
            <li>打開卡片 → 在「AI 轉稿」區貼進稿連結或上傳檔路徑 → 按「⚙️ 跑 AI 轉稿」。</li>
            <li>卡片自動移到「製作中」,跑完自動移「待發佈」並通知主審。</li>
            <li>主審審稿 → 發官網 + 社群 → 在卡片回填發佈連結 →「通知 BD 回傳客戶」→ 拖到「已結案」(自動扣合約額度)。</li>
          </ol>
          <h3>情境 B:我只想快速轉一篇稿(不走看板)</h3>
          <p>到<b>處理稿件</b>頁,上傳檔案或貼連結、選文稿類型 + 押註 + 供稿方,按開始,逐階段檢視後一鍵發布。</p>
          <h3>情境 C:批次 / 程式化</h3>
          <p>用下方 <a href="#cli">CLI</a> 或 <a href="#api">REST API</a>。</p>
        </Doc>

        <Doc id="concepts" title="核心概念">
          <div className="table-wrap"><table>
            <thead><tr><th>名詞</th><th>說明</th></tr></thead>
            <tbody>
              <tr><td><b>Workflow</b></td><td>一條處理流程定義;主力是 <code>article</code>(7 階段)。</td></tr>
              <tr><td><b>Job</b></td><td>一次 workflow 執行,狀態存 DB(durable),可查歷史、SSE 重播、從任一階段重跑。</td></tr>
              <tr><td><b>稿件卡(Task)</b></td><td>看板上一個工作項;Pipeline A 的卡會掛一個 Job(AI 轉稿)。</td></tr>
              <tr><td><b>Pipeline</b></td><td>A 廣編/快訊/新聞、B 軟文(常規/專訪/深度)、C Banner;由品項自動判定。</td></tr>
              <tr><td><b>合約 / 額度</b></td><td>合約=N 篇稿件的額度容器;稿件結案自動扣對應品項額度(新聞稿不扣)。</td></tr>
              <tr><td><b>角色</b></td><td>BD(談案)/ DM(串接)/ 主審(審稿撰稿);純記名,無權限系統。</td></tr>
            </tbody>
          </table></div>
        </Doc>

        <Doc id="web" title="網頁操作">
          <h3>1. 部門看板(/kanban)</h3>
          <ul className="tick">
            <li><b>建卡</b>:「＋ 新增稿件」填客戶 / 品項 / 角色 / 合約;品項自動帶 pipeline 與押註。</li>
            <li><b>三視圖</b>:看板(可拖拉)/ 清單(分組可收合)/ 表格(可排序)。</li>
            <li><b>分組 + 篩選</b>:依階段/Pipeline/客戶/DM/主審/合約… 重新切;篩選列 + 搜尋 + 只看逾期。</li>
            <li><b>卡片抽屜</b>:編欄位、跑 AI 轉稿、回填發佈連結、留言協作、看活動時間軸、開完整管線。</li>
            <li><b>合約 / 額度</b>:工具列「📑 合約 / 額度」建合約、設各品項額度、看用量。</li>
          </ul>
          <h3>2. 處理稿件(/)</h3>
          <ul className="tick">
            <li>上傳檔案(pdf/docx/md/txt/html/rtf/doc/odt)或貼連結 → 選文稿類型 + 押註 + 供稿方。</li>
            <li>跑 7 階段;逐階段檢視輸出 / 行級 diff / 從任一步重跑;成稿可編輯後一鍵發布 WordPress。</li>
          </ul>
          <h3>3. 設定 / Prompt(/settings)</h3>
          <p className="muted">調整各 Agent 的 provider / model / prompt、押註範本,用具名版本管理切換與回溯。</p>
        </Doc>

        <Doc id="placements" title="廣告版位">
          <p>把官網 / 電子報 / Line@ / 社群的<b>廣告版位</b>(banner inventory)視覺化,給 BD 展示與管理。
            側邊欄「廣告版位」下分五個子頁,共用同一份版位資料(存瀏覽器 localStorage <code>pref:placements-data</code>,即時自動存檔)。</p>
          <ul className="tick">
            <li><b>版位地圖(/placements)</b>:各載體的版位示意圖,點任一版位看右側詳情 —— 尺寸 / 格式 / 檔案上限 / 曝光位置、目前客戶與檔期(含單一版位迷你時間軸)、素材狀態。非展示模式可直接改狀態 / 客戶 / 檔期 / 素材。</li>
            <li><b>規格(/placements/specs)</b>:全版位規格表,可依狀態 / 載體篩選、搜尋名稱 / 說明 / 客戶。</li>
            <li><b>檔期(/placements/schedule)</b>:檔期總覽,日曆甘特圖(橫軸日期、今日線、依狀態上色)/ 列表兩種檢視;點任一日看該日整體狀況(已售 / 洽談 / 可售與佔用客戶)。</li>
            <li><b>當日預覽(/placements/preview)</b>:選任一日期(可上 / 下一天、回今天),所見即所得預覽各載體當天版位樣貌 —— 有素材顯示實際 creative,沒素材顯示虛線示意 +「等待素材」,未預定顯示開放銷售。</li>
            <li><b>狀態看板(/placements/board)</b>:依業務生命週期管理版位卡片(預設 洽談中 / 安排中 / 已安排 / 已上架 / 進行中 / 結案準備 / 已結案 + 可售 backlog)。欄位可自訂(新增 / 刪除 / 重命名 / 重設,存 <code>pref:placements-stages</code>);卡片可拖拉或下拉換欄。</li>
          </ul>
          <div className="doc-callout">
            <b>展示模式(Pitch Mode)</b>
            <p className="muted" style={{ margin: '4px 0 0' }}>地圖頁可開「展示簡報模式」,遮去客戶名等內部資訊、保留檔期與版位視覺,適合對外 pitch。</p>
          </div>
          <p className="muted">註:廣告版位目前為前端 localStorage 管理(尚未接後端 API),資料存在各自瀏覽器。</p>
        </Doc>

        <Doc id="cli" title="CLI 用法">
          <p className="muted">在 <code>backend/</code> 下執行;CLI 與 API 共用同一個 runner,適合批次 / 回歸,不進 job 系統。</p>
          <Code lang="shell">{`# 列出所有 workflow
uv run python cli.py --list

# 跑一條 article(貼連結)
uv run python cli.py article \\
  --input '{"url":"https://example.com/post","article_type":"sponsored","supplier":"客戶名"}'

# 跑 article(本機檔案)
uv run python cli.py article \\
  --input '{"file":"../input-example/sample.docx","article_type":"press-release"}'

# 回歸評分(跑 article + 結構評分)
uv run python cli.py eval --file ../input-example/sample.docx
uv run python cli.py eval --url  https://example.com/post

# 加 --judge:llm_judge 品質評審(選用開發工具,會用 API key;routine 建議走 evals/ subagent)
uv run python cli.py eval --file ../input-example/sample.docx --judge`}</Code>
          <p className="hint"><code>article_type</code>:<code>regular</code> / <code>sponsored</code>(廣編)/ <code>press-release</code>(新聞稿)。</p>
        </Doc>

        <Doc id="api" title="REST API">
          <p>Base:同源時用相對路徑;外部用 <code>https://bd-console.mbp.fud.city</code>。回應皆 JSON;
            SSE 端點回 <code>text/event-stream</code>。目前<b>無 auth</b>(內部工具,走 tunnel)。</p>
          {API_GROUPS.map((g) => (
            <div key={g.group} className="api-group">
              <h3>{g.group}</h3>
              <div className="table-wrap"><table>
                <thead><tr><th>方法</th><th>路徑</th><th>說明</th></tr></thead>
                <tbody>{g.rows.map(([m, path, desc]) => (
                  <tr key={`${m}_${path}`}><td><Method m={m} /></td><td><code>{path}</code></td><td className="muted">{desc}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          ))}
          <h3>範例:跑一篇稿(curl)</h3>
          <Code lang="shell">{`BASE=https://bd-console.mbp.fud.city

# 1) 建 job(貼連結)
curl -s -X POST $BASE/jobs -H 'Content-Type: application/json' \\
  -d '{"workflow":"article","input":{"url":"https://example.com/post","article_type":"sponsored"}}'
# → {"id": 62, "status": "pending"}

# 2) 看即時進度(SSE,事件 event: stage/done/error)
curl -N $BASE/jobs/62/stream

# 3) 取最終結果(含逐階段輸出)
curl -s "$BASE/jobs/62?full=true"

# 4) 發布到 WordPress(先存草稿)
curl -s -X POST $BASE/publish -H 'Content-Type: application/json' \\
  -d '{"job_id":62,"status":"draft"}'`}</Code>
          <h3>範例:看板建卡 + 觸發 AI 轉稿</h3>
          <Code lang="shell">{`# 建一張 Pipeline A 稿件卡(item_type 自動帶 pipeline/押註)
curl -s -X POST $BASE/board/tasks -H 'Content-Type: application/json' \\
  -d '{"title":"JPEX 廣編","item_type":"廣編稿","client":"JPEX","source_url":"https://...","dm_owner":"Meg"}'
# → {"id": 7, "pipeline":"A", ...}

# 觸發 AI 轉稿(卡自動移「製作中」,完成自動移「待發佈」+ 通知主審)
curl -s -X POST $BASE/board/tasks/7/run -H 'Content-Type: application/json' -d '{"actor":"Meg"}'

# 訂閱看板即時事件
curl -N $BASE/board/stream`}</Code>
          <p className="hint">錯誤格式:FastAPI 標準 <code>{'{"detail":"…"}'}</code>(4xx/5xx)。SSE 斷線可重連,歷史事件會重播。</p>
        </Doc>

        <Doc id="deploy" title="部署 / 維運">
          <Code lang="shell">{`# 前端 build(產出 backend 同源托管的 dist)
cd frontend && pnpm build

# 全套測試
cd backend && uv run pytest -q          # 後端 139 通過 / 1 skip
cd frontend && pnpm test -- --run       # 前端 43 通過

# 跑服務(本機)
cd backend && uv run uvicorn app.main:app --port 8000

# 重啟 launchd 服務(MBP production)
launchctl kickstart -k gui/$(id -u)/com.btai.bd-backend`}</Code>
          <p className="hint">前端 production build 走同源相對路徑(免 CORS、免設 VITE_API_BASE);
            後端啟動會自動建 DB、遷移舊看板、seed Delivery 預設板。OCR 需 <code>uv sync --extra ocr</code>。</p>
        </Doc>
      </div>

      <aside className="docs-toc">
        <div className="toc-title">本頁目錄</div>
        <nav>{DOC_TOC.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
      </aside>
    </div>
  )
}

function scoreColor(s: number): string {
  if (s >= 85) return 'var(--accent)'
  if (s >= 70) return '#e0a020'
  return '#e06060'
}

function ModulesPanel() {
  const [sp, setSp] = useSearchParams()
  const main = MAIN_MODULES.find((x) => x.key === sp.get('mod')) ?? MAIN_MODULES[0]
  const setMain = (k: string) => { sp.set('mod', k); sp.delete('sub'); setSp(sp, { replace: true }) }
  const leaf = main.subs.find((s) => s.key === sp.get('sub')) ?? main.subs[0]
  const setLeaf = (k: string) => { sp.set('sub', k); setSp(sp, { replace: true }) }
  const overall = Math.round(MAIN_MODULES.reduce((a, x) => a + mainScore(x), 0) / MAIN_MODULES.length)
  return (
    <div className="panel">
      <h2>🧩 系統模組總覽 — 主模組 → 子模組 / 情境 / 實現 / 評分　<span className="mod-avg">全平台均分 {overall}/99</span></h2>
      {/* 第一層:主處理模組 */}
      <div className="mod-tabs main">
        {MAIN_MODULES.map((x) => {
          const s = mainScore(x)
          return (
            <button key={x.key} className={`mod-tab ${x.key === main.key ? 'on' : ''}`} onClick={() => setMain(x.key)}>
              <span>{x.name}</span>
              <b style={{ color: scoreColor(s) }}>{s}</b>
            </button>
          )
        })}
      </div>
      <p className="mod-summary muted">{main.summary}</p>
      {/* 第二層:子模組(僅當有多個子模組時顯示) */}
      {main.subs.length > 1 && (
        <div className="mod-tabs sub">
          {main.subs.map((s) => (
            <button key={s.key} className={`mod-tab small ${s.key === leaf.key ? 'on' : ''}`} onClick={() => setLeaf(s.key)}>
              <span>{s.name}</span>
              <b style={{ color: scoreColor(s.score) }}>{s.score}</b>
            </button>
          ))}
        </div>
      )}
      <div className="mod-detail">
        <div className="mod-head">
          <div className="mod-bigscore" style={{ color: scoreColor(leaf.score) }}>{leaf.score}<i>/99</i></div>
          <div className="mod-head-txt">
            <h3>{leaf.name}</h3>
            <p className="muted">{leaf.status}</p>
          </div>
        </div>
        <div className="mod-impl">
          <h4>實現方式 / 依賴</h4>
          <p><code>{leaf.deps}</code></p>
          <p className="muted">{leaf.how}</p>
        </div>
        <div className="mod-impl">
          <h4>情境設想</h4>
          <ul className="tick scen">{leaf.scenarios.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="mod-cols">
          <div>
            <h4>強項</h4>
            <ul className="tick">{leaf.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h4>不足 / 風險</h4>
            <ul className="tick gap">{leaf.gaps.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
        <div className="mod-impl">
          <h4>測試</h4>
          <p className="muted">{leaf.tests}</p>
        </div>
      </div>
      <p className="hint">評分 = 成熟度 × 覆蓋面 × 風險 × 測試覆蓋的綜合;抽取模組依賴研究見 <code>docs/EXTRACTION-MODULE.md</code>。</p>
    </div>
  )
}

function TestTable({ rows }: { rows: Row[] }) {
  return (
    <div className="table-wrap"><table className="test-table">
      <thead><tr><th>項目</th><th>測試方式</th><th>結果 / 評分</th><th>狀態</th></tr></thead>
      <tbody>
        {rows.map(([item, how, result, ok]) => (
          <tr key={item}>
            <td>{item}</td>
            <td className="muted">{how}</td>
            <td>{result}</td>
            <td><span className={`status ${ok ? 'done' : 'error'}`}>{ok ? '通過' : '失敗'}</span></td>
          </tr>
        ))}
      </tbody>
    </table></div>
  )
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={ok ? { color: 'var(--accent)' } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
