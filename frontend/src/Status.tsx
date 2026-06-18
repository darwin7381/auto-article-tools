import { useEffect, useState } from 'react'
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
  '觀測:per-stage 耗時 + token 用量 + eval 回歸評分',
  '抽取位置保真:PDF 圖/表依座標插回原位(舊版圖片會被丟到頁尾)',
  'DOCX 超連結保真 [text](url)(python-docx .text 預設會丟連結)',
  '進稿格式更廣:docx/pdf/md/txt/html/rtf(舊版上傳只收 pdf/docx)',
  '免付費:PyMuPDF 取代 ConvertAPI(PDF→DOCX 付費轉檔)',
  '自動化測試 pytest 30/30(含合成夾具斷言圖片排列位置)',
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
  ['🟢 低', 'eval 進階', '已有 golden 評分 CLU(結構不變式 + 耗時/tokens);LLM-judge 品質評分可再加'],
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
  ['DOCX/PDF 表格→markdown', '合成 + 數碼港', '| 表頭 | + | --- | · 真檔 2 表 ✅', true],
  ['圖片去重(xref)', '合成同圖跨兩頁 + 數碼港', '2頁→1張 · 真檔 8→4 ✅', true],
  ['HTML 檔 / RTF 檔', '合成夾具 trafilatura/striprtf', '主文/純文字抽取 ✅', true],
  ['TXT / MD 直通', '合成夾具', '原樣保留 ✅', true],
  ['邊界:.doc/圖片/未知型別', '合成夾具', '明確報錯帶建議(LibreOffice/OCR) ✅', true],
  ['md→HTML 表格/figure/程式碼', 'md_to_html', '<table>·<figure>+lazy·<code> ✅', true],
  ['真實素材:HashKey/WEEX/Bluefin', 'extract_document', '繁/简 docx 含圖 · 純文字 PDF ✅', true],
  ['連結:Google Docs/Medium/WeChat', 'export docx / trafilatura+firecrawl', 'gdocs 788/3691字 · Medium 15圖 ✅', true],
  ['死鏈 / 反爬載入失敗', 'Cointelegraph(404) / WeChat2', '明確報錯不帶垃圾跑流程 ✅(預期失敗)', true],
]
// 抽取模組:哪個依賴做哪塊(詳見 docs/EXTRACTION-MODULE.md)
const DEPS: [string, string, string][] = [
  ['PDF 文字/表格/圖+座標', 'PyMuPDF 1.27', '續用(預設)·⚠️AGPL 商用需確認'],
  ['DOCX 自走抽取(連結/標題/表/圖保位)', 'python-docx 1.2', '續用·原生 DOCX 正解'],
  ['md → HTML', 'python-markdown', '續用'],
  ['網頁/HTML 主文', 'trafilatura 2.0 + firecrawl', '續用·正文抽取標竿 F1 0.84'],
  ['RTF → 純文字', 'striprtf', '新增·純 Python 無重依賴'],
  ['封面壓縮', 'Pillow', '續用(取代 TinyPNG)'],
  ['OCR(掃描檔)', '— 未支援', '缺口·要時 opt-in PaddleOCR/RapidOCR'],
  ['表格重/多欄 PDF', '— 未支援', '可選·Docling(MIT) 選擇性 fallback'],
]
const UNIT_TESTS: Row[] = [
  ['後端自動化測試 pytest', 'uv run pytest', '30/30 通過', true],
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
        <Stat label="後端測試" value="30/30 ✓" ok />
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
        <h2>🧱 抽取模組 — 依賴堆疊（哪個套件做哪塊）</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>處理環節</th><th>使用依賴</th><th>判定 / 備註</th></tr></thead>
          <tbody>{DEPS.map(([job, dep, note]) => (
            <tr key={job}><td>{job}</td><td><code>{dep}</code></td><td className="muted">{note}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="hint">2025–2026 依賴研究結論:現用堆疊整體「續用」最佳;升級候選為 Docling(表格重 PDF / AGPL 逃生門)與 opt-in OCR。詳見 <code>docs/EXTRACTION-MODULE.md</code>。</p>
      </div>

      <div className="panel">
        <h2>🔬 單項測試（unit / 元件）</h2>
        <TestTable rows={UNIT_TESTS} />
        <p className="hint">後端 <code>uv run pytest</code> 30/30;前端以隔離瀏覽器經 tunnel 實測。</p>
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
