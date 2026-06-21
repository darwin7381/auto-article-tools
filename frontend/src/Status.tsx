import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getHealth, listJobs, listSiteConfig, listWorkflows, type Job } from './api'

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
  '觀測:per-stage 耗時 + token + 結構評分;品質評審 routine 走 Claude subagent(訂閱、不燒 API)+ llm_judge 選用工具',
  '抽取位置保真:PDF 圖/表依座標插回原位(舊版圖片會被丟到頁尾)',
  'DOCX 超連結保真 [text](url)(python-docx .text 預設會丟連結)',
  '進稿格式更廣:docx/pdf/md/txt/html/rtf(舊版上傳只收 pdf/docx)',
  '免付費:PyMuPDF 取代 ConvertAPI(PDF→DOCX 付費轉檔)',
  '自動化測試 pytest 48/48(含合成夾具斷言圖片排列位置)',
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
        how: '標題層級正規化、用摘要生成 intro_quote、首字 Dropcap、頁首/頁尾免責(3-tier:版本>Strapi>內建)、TG banner+相關閱讀、供稿方名稱替換 → 寫回 wp.content。',
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
    key: 'config', name: '⑥ 設定 / 版本管理', summary: 'Agent 設定 + Prompt/押註 具名版本(切換/回溯/刪除) + Strapi 押註來源,3-tier 解析。',
    subs: [
      {
        key: 'agentcfg', name: 'Agent 設定', score: 85, status: '可用 · prompt/model/溫度可調',
        deps: 'agent_config.py',
        how: '每個 agent 的 provider/model/system+user prompt/溫度/max_tokens 讀自 DB 生效版。',
        scenarios: ['調 prompt 措辭', '換 model / provider', '調溫度控發散'],
        strengths: ['設定即時生效', 'API 可程式化讀寫'],
        gaps: ['無 A/B 對照跑'],
        tests: 'E2E 透過設定驅動跑通;版本生命週期見下',
      },
      {
        key: 'version', name: 'Prompt / 押註 版本', score: 86, status: '強 · 生命週期全測',
        deps: 'versions.py',
        how: '具名儲存 prompt/押註 組合;建立 / 切換生效 / 回溯 / 刪除;上方顯示目前生效版本。',
        scenarios: ['存多套 prompt 組合', '一鍵切換/回退', '刪除過時組合'],
        strengths: ['切換/回退/刪除全綠', '避免覆蓋即失去舊版'],
        gaps: ['版本 diff 視覺化可再加'],
        tests: 'test_config_version_lifecycle:建立/切換/刪除/回退',
      },
      {
        key: 'strapi', name: 'Strapi / 押註來源', score: 82, status: '可用 · 分型解析 + fallback',
        deps: 'strapi.py + site_config.py + templates.py',
        how: '從 Strapi 讀押註範本(per-type);3-tier 解析:具名版本 > Strapi > 內建;token 失效時 public read fallback。',
        scenarios: ['從 CMS 拉押註範本', '廣編/新聞分型套不同押註'],
        strengths: ['分型(廣編/新聞)正確', 'public read fallback(401 不致命)', '匯入 12 筆實測'],
        gaps: ['設定真相散在 R2/Strapi/env 三處(見 memory)'],
        tests: 'Strapi 匯入 12 筆 + resolve 分型實測(廣編=1/新聞=2)',
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
        gaps: ['前端無自動化測試(靠隔離瀏覽器經 tunnel 實測)', 'bundle ~750KB 未 code-split'],
        tests: '隔離瀏覽器經 tunnel:路由/深連結/側邊欄收合/RWD/拖放/主題/0 console 錯誤',
      },
    ],
  },
]
const UNIT_TESTS: Row[] = [
  ['後端自動化測試 pytest', 'uv run pytest', '48/48 通過', true],
  ['進階組稿六項(正規化/引言/押註位置/dropcap/TG/紅連結)', 'test_format_article_full', '通過', true],
  ['D1 內嵌圖片抽取', 'ingest 實跑 HashKey docx', '抽到 1 圖 ✅', true],
  ['D2 圖片 figure 包裝 + lazy', 'test_md_to_html_figure_wrap', '通過', true],
  ['eval 評分器(結構不變式 + 繁中比例)', 'test_eval_scorecard', '通過', true],
  ['版本管理生命週期(建立/切換/刪除/回退)', 'test_config_version_lifecycle', '通過', true],
  ['durable job 端到端 + SSE 重播 + 404', 'test_api', '通過', true],
  ['Strapi 匯入 + 押註分型讀取', '匯入 12 筆 + resolve 實測', '廣編/新聞各正確 ✅', true],
  ['影像 gpt-image-2 streaming + Pillow 壓縮', '單獨重現(183s 斷→72s 成功)', '通過 · 省 84%', true],
  ['前端 dashboard / RWD / 拖放 / 主題 / 快取', '隔離瀏覽器(桌面 1440 + 390 手機)', '無溢出 ✅', true],
]

// Subagent 獨立稽核(走訂閱、不燒 API;輔助佐證,不覆寫上方模組分數)。
// 紀錄:evals/records/2026-06-21-module-capability-auditor-batch.md;角色:evals/agents/
const AUDITS: { mod: string; owner: number; audit: number; finding: string }[] = [
  { mod: '進稿抽取', owner: 86, audit: 84, finding: '.doc 成功路徑、RTF 非 utf8、gdoc 圖嵌入分支未測' },
  { mod: 'AI 內容處理', owner: 82, audit: 32, finding: '3 個 LLM agent + chat()/structured() 零直接測試' },
  { mod: '封面圖生成', owner: 82, audit: 58, finding: 'generate_image 串流/重試/stage 編排零測' },
  { mod: '進階組稿', owner: 88, audit: 58, finding: '押註 3-tier 解析、供稿方替換、寫回未測' },
  { mod: '任務系統', owner: 90, audit: 58, finding: 'crash recovery、rerun-from-stage、WAL、error path 未測' },
  { mod: '設定 / 版本', owner: 84, audit: 38, finding: 'config overlay、押註解析、Strapi 匯入零測' },
  { mod: 'WordPress 發布', owner: 82, audit: 41, finding: '零自動測試;封面掉失不回報、重複發布風險' },
  { mod: '觀測 / 評測', owner: 80, audit: 64, finding: '結構評分有測;未運維化、整合未測' },
  { mod: '前端 Dashboard', owner: 84, audit: 83, finding: '前端零自動化測試(僅人工瀏覽器)' },
]

function AuditsPanel() {
  return (
    <div className="panel">
      <h2>🔬 Subagent 獨立稽核（走訂閱,不燒 API）</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        9 個獨立 Claude subagent(<code>module-capability-auditor</code>)各自讀程式碼+測試評分,偏重「自動化測試覆蓋」故較嚴 ——
        與維護者分數的差距 ≈ <b>自動化測試債</b>。<b>此為輔助佐證,不覆寫上方模組分數。</b>
        紀錄 <code>evals/records/2026-06-21-…-batch.md</code>;角色 <code>evals/agents/</code>。
      </p>
      <div className="table-wrap"><table>
        <thead><tr><th>模組</th><th>維護者分</th><th>獨立稽核分</th><th>差距</th><th>主要待補(測試)</th></tr></thead>
        <tbody>{AUDITS.map((a) => (
          <tr key={a.mod}>
            <td>{a.mod}</td>
            <td><b style={{ color: scoreColor(a.owner) }}>{a.owner}</b></td>
            <td><b style={{ color: scoreColor(a.audit) }}>{a.audit}</b></td>
            <td className="muted">{a.owner - a.audit > 0 ? `−${a.owner - a.audit}` : '0'}</td>
            <td className="muted">{a.finding}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="hint">
        另有 <code>content-faithfulness</code> 評審角色(比對原文 vs 成稿,抓丟內容/幻覺):需真實 article「原文+成稿」配對才跑,尚未執行。
        共同主題:多數模組邏輯經 code-review + 人工/整合驗證可用,但缺自動化單元測試 —— 補測順序見紀錄。
      </p>
    </div>
  )
}

export function StatusPanel() {
  const [live, setLive] = useState<{ health: boolean; wf: number; jobs: number; cfg: number; done: number }>(
    { health: false, wf: 0, jobs: 0, cfg: 0, done: 0 })
  useEffect(() => {
    (async () => {
      const [h, w, j, c] = await Promise.all([
        getHealth().then(() => true).catch(() => false),
        listWorkflows().then((x) => x.length).catch(() => 0),
        listJobs().catch(() => [] as Job[]),
        listSiteConfig().then((x) => x.length).catch(() => 0),
      ])
      setLive({ health: h, wf: w, jobs: j.length, cfg: c, done: j.filter((x) => x.status === 'done').length })
    })()
  }, [])

  return (
    <div className="status-page">
      <div className="stat-cards">
        <Stat label="後端" value={live.health ? '運行中' : '未連線'} ok={live.health} />
        <Stat label="Workflows" value={String(live.wf)} />
        <Stat label="Jobs 總數" value={String(live.jobs)} />
        <Stat label="完成 Jobs" value={String(live.done)} />
        <Stat label="Strapi 設定" value={String(live.cfg)} />
        <Stat label="後端測試" value="48/48 ✓" ok />
      </div>

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

      <ModulesPanel />

      <AuditsPanel />

      <div className="panel">
        <h2>🧪 完整流程測試（E2E,跑整條 pipeline）</h2>
        <TestTable rows={E2E_TESTS} />
        <p className="hint">最近一次完整重跑:見第一列 job#47(2026-06-18 console 路徑從頭跑)。</p>
      </div>

      <div className="panel">
        <h2>🔧 格式轉換保真度測試（最易掉東西的環節 — 合成夾具斷言排列位置 + 真實素材）</h2>
        <TestTable rows={CONV_TESTS} />
        <p className="hint">🔑 = 用程式即時造夾具,精準斷言「圖片/文字的排列位置」(肉眼難查)。後端 <code>tests/test_conversion.py</code> 30 項;模組覆蓋面/指標/依賴審計見 <code>docs/EXTRACTION-MODULE.md</code>。</p>
      </div>

      <div className="panel">
        <h2>🔬 單項測試（unit / 元件）</h2>
        <TestTable rows={UNIT_TESTS} />
        <p className="hint">後端 <code>uv run pytest</code> 48/48;前端以隔離瀏覽器經 tunnel 實測。</p>
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
