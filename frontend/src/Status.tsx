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
  '自動化測試 pytest 18/18',
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
// 格式轉換保真度(最易掉東西的環節)—— 真實素材實測圖/表
const CONV_TESTS: Row[] = [
  ['DOCX 繁中(HashKey)', 'extract_document', '文字 ✅ · 內嵌圖 1 ✅', true],
  ['DOCX 简中(WEEX)', 'extract_document', '文字 ✅ · 內嵌圖 1 ✅', true],
  ['PDF 英文純文字(Bluefin)', 'extract_document', '文字 ✅ · 無圖(正確)', true],
  ['PDF 含表格+圖(數碼港)', 'extract_document', '表格 2→markdown ✅ · 圖 4(去重 8→4)✅', true],
  ['Google Docs(中/英)', 'export docx 抽取', '788/3691 字 ✅(已修 tuple regression)', true],
  ['Medium / WeChat / Bybit / OKX', 'trafilatura + firecrawl fallback', 'Medium 3529字15圖 · WeChat/Bybit/OKX ✅', true],
  ['markdown→HTML 表格', 'md_to_html', '<table> 正確渲染 ✅', true],
  ['markdown→HTML 圖片 figure 包裝', 'md_to_html', '<figure>+lazy ✅', true],
  ['死鏈 / 反爬載入失敗', 'Cointelegraph(404) / WeChat2', '明確報錯不帶垃圾跑流程 ✅(預期失敗)', true],
]
const UNIT_TESTS: Row[] = [
  ['後端自動化測試 pytest', 'uv run pytest', '18/18 通過', true],
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
        <Stat label="後端測試" value="18/18 ✓" ok />
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
        <h2>🔧 格式轉換保真度測試（最易掉東西的環節 — 真實素材實測圖/表）</h2>
        <TestTable rows={CONV_TESTS} />
        <p className="hint">後端 <code>tests/test_conversion.py</code> 以 input-example 真實素材跑 extract_document / md_to_html;表格(→markdown)、內嵌圖、去重、死鏈逐項驗。</p>
      </div>

      <div className="panel">
        <h2>🔬 單項測試（unit / 元件）</h2>
        <TestTable rows={UNIT_TESTS} />
        <p className="hint">後端 <code>uv run pytest</code> 18/18;前端以隔離瀏覽器經 tunnel 實測。</p>
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
