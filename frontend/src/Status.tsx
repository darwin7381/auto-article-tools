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
  '自動化測試 pytest 11/11',
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
  ['🔴 高', '內嵌圖片抽取(D1)', '舊版 mammoth 把 docx/pdf 內嵌圖抽出存 R2;新版只抽文字 → 有配圖稿件會掉圖'],
  ['🟡 中', '圖片 figure 包裝(D2)', '舊版圖片包 <figure class=article-image>+lazy;新版裸 <img>'],
  ['🟡 中', '特色圖取內文首圖(D3)', '舊版可用原文首圖當特色圖;新版僅生成封面(且因 D1 內文無圖)'],
  ['🟡 中', '作者 ID 自動帶入', '舊版依文稿類型自動填 author(廣編=1/新聞=2);新版表單需手填'],
  ['🟢 低', '登入 / 權限(Clerk)', '舊版有;新版無(tunnel 公開有風險)'],
  ['🟢 低', '觀測 + eval', '成本追蹤、prompt 回歸測試;兩版都還沒做'],
]
const TESTED: [string, string][] = [
  ['article 完整 7 階段端到端', 'E2E job#46 + 4 份文件實測'],
  ['進稿:docx 简繁/pdf 英繁/md', 'CLI 抽取實測'],
  ['進稿:Google Docs 中英/Medium/WeChat/OKX', 'URL 抽取 5/5 通過'],
  ['Durable job:建立/SSE/刷新接回/從任一步重跑', '隔離瀏覽器實測'],
  ['版本管理:agent + 押註(建立/切換/刪除)', 'pytest + 瀏覽器實測'],
  ['進階組稿:正規化/引言/dropcap/TG/押註替換', '單元六項 + E2E job#46(進到 wp.content)'],
  ['WordPress 實際發布到測試站', '草稿+正式皆驗(驗後刪除)'],
  ['Strapi 匯入 12 筆 + 押註分型讀取', '匯入 + resolve 實測'],
  ['影像 gpt-image-2 streaming + Pillow 壓縮', '單獨重現 + pipeline 實測'],
  ['前端:dashboard / RWD / 拖放 / 主題 / 快取修復', '隔離瀏覽器(桌面+390 手機)'],
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
        <Stat label="後端測試" value="11/11 ✓" ok />
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
        <h2>🧪 已測試項目（{TESTED.length}）</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>項目</th><th>驗證方式</th></tr></thead>
          <tbody>{TESTED.map(([w, how]) => <tr key={w}><td>{w}</td><td className="muted">{how}</td></tr>)}</tbody>
        </table></div>
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

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={ok ? { color: 'var(--accent)' } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
