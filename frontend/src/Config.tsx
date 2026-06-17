import { useEffect, useState } from 'react'
import {
  getAgent, getAgentDefault, getBuiltinTemplates, importStrapi, listAgents,
  listSiteConfig, resetAgent, updateAgent, type Agent,
} from './api'
import { toast } from './toast'

function str(o: Record<string, unknown>, k: string): string {
  return o[k] == null ? '' : String(o[k])
}

export function ConfigPanel() {
  return (
    <>
      <AgentConfig />
      <SiteTemplates />
    </>
  )
}

/** AI Agent 設定：預設(seed) vs 現用(DB) 並排直接看。 */
function AgentConfig() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [cur, setCur] = useState<Record<string, unknown> | null>(null)
  const [def, setDef] = useState<Record<string, unknown> | null>(null)
  const [msg, setMsg] = useState('')

  const load = () => listAgents().then((a) => { setAgents(a); if (!name && a[0]) open(a[0].name) }).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function open(n: string) {
    setName(n); setMsg('')
    const [c, d] = await Promise.all([getAgent(n), getAgentDefault(n).catch(() => null)])
    setCur(c); setDef(d)
  }
  function set(k: string, v: unknown) { setCur((c) => ({ ...(c ?? {}), [k]: v })) }

  async function save() {
    if (!cur) return
    setMsg('儲存中…')
    try {
      await updateAgent(name, {
        provider: cur.provider, model: cur.model, temperature: cur.temperature,
        system_prompt: cur.system_prompt, user_prompt: cur.user_prompt,
      })
      setMsg('✓ 已儲存到 DB'); toast.ok(`${name} 已儲存`); load()
    } catch (e) { setMsg('✗ ' + String(e)); toast.err('儲存失敗') }
  }
  async function reload() { setCur(await getAgent(name)); setMsg('已重新載入 DB 版本') }
  async function doReset() {
    if (!confirm(`重置 ${name} 回預設（seed，從 R2 匯出的真值）？會覆蓋目前 DB 內容。`)) return
    setCur(await resetAgent(name)); setMsg('✓ 已重置為預設'); toast.ok(`${name} 已重置`); load()
  }
  function applyDefault() {
    if (def) { setCur((c) => ({ ...(c ?? {}), ...def })); setMsg('已把預設帶入右側（尚未儲存，按儲存才生效）') }
  }

  const c = (cur ?? {}) as Record<string, unknown>
  const d = (def ?? {}) as Record<string, unknown>
  const diff = (k: string) => def != null && str(c, k) !== str(d, k)

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2>AI Agent 設定 — 預設 vs 現用對照</h2>
      <div className="agent-chips">
        {agents.map((a) => (
          <button key={a.name} className={`chip-btn ${a.name === name ? 'on' : ''}`} onClick={() => open(a.name)}>
            {a.name}
          </button>
        ))}
      </div>

      {!cur ? <p className="muted">載入中…</p> : (
        <>
          <div className="cmp-row">
            <div className="cmp-col def">
              <div className="cmp-label">預設（seed，reset 會回到這個）</div>
              <label>provider / model</label>
              <div className="ro">{str(d, 'provider')} / {str(d, 'model')}</div>
            </div>
            <div className="cmp-col cur">
              <div className="cmp-label">現用（DB，實際在跑）{diff('model') && <span className="tag-diff">≠</span>}</div>
              <label>provider / model</label>
              <div className="row">
                <input type="text" value={str(c, 'provider')} onChange={(e) => set('provider', e.target.value)} style={{ flex: 1 }} />
                <input type="text" value={str(c, 'model')} onChange={(e) => set('model', e.target.value)} style={{ flex: 2 }} />
              </div>
            </div>
          </div>

          <CmpField label="system prompt" dval={str(d, 'system_prompt')} cval={str(c, 'system_prompt')}
            diff={diff('system_prompt')} onChange={(v) => set('system_prompt', v)} minH={200} />
          <CmpField label="user prompt" dval={str(d, 'user_prompt')} cval={str(c, 'user_prompt')}
            diff={diff('user_prompt')} onChange={(v) => set('user_prompt', v)} minH={90} />

          <div className="row" style={{ marginTop: 14 }}>
            <button className="primary" style={{ width: 'auto', marginTop: 0 }} onClick={save}>儲存到 DB</button>
            <button className="ghost" onClick={reload}>重新載入 DB</button>
            <button className="ghost" onClick={doReset}>重置為預設</button>
            <button className="ghost" onClick={applyDefault}>把預設帶到右側</button>
            <span className="muted">{msg}</span>
          </div>
        </>
      )}
    </div>
  )
}

/** 一個欄位的「預設(唯讀) | 現用(可編輯)」並排,有差異標紅。 */
function CmpField({ label, dval, cval, diff, onChange, minH }: {
  label: string; dval: string; cval: string; diff: boolean
  onChange: (v: string) => void; minH: number
}) {
  return (
    <div className="cmp-row">
      <div className="cmp-col def">
        <div className="cmp-label">預設 {label}（{dval.length} 字）</div>
        <pre className="ro-pre" style={{ minHeight: minH }}>{dval || '(無)'}</pre>
      </div>
      <div className="cmp-col cur">
        <div className="cmp-label">現用 {label}（{cval.length} 字）{diff && <span className="tag-diff">≠ 預設</span>}</div>
        <textarea value={cval} onChange={(e) => onChange(e.target.value)} style={{ minHeight: minH }} />
      </div>
    </div>
  )
}

/** 站台範本（Strapi 域）：內建預設 vs DB 現況 —— 判斷要不要開 Strapi 的依據。 */
function SiteTemplates() {
  const [builtin, setBuiltin] = useState<Awaited<ReturnType<typeof getBuiltinTemplates>> | null>(null)
  const [dbRows, setDbRows] = useState<{ kind: string; key: string; value: Record<string, unknown> }[]>([])
  const [strapiMsg, setStrapiMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => {
    getBuiltinTemplates().then(setBuiltin).catch(() => {})
    listSiteConfig().then(setDbRows).catch(() => {})
  }
  useEffect(() => { reload() }, [])

  async function runImport() {
    setBusy(true); setStrapiMsg('匯入中…（需本機 Strapi 開著）')
    try {
      const o = await importStrapi()
      const ok = Object.values(o.imported).some((n) => n > 0)
      setStrapiMsg(ok ? '✓ 匯入成功：' + JSON.stringify(o.imported) : '⚠️ Strapi 沒回資料（多半是沒開機）：' + JSON.stringify(o.imported))
      ok ? toast.ok('Strapi 設定已匯入 DB') : toast.err('Strapi 未匯入（檢查是否開機）')
      reload()
    } catch (e) { setStrapiMsg('✗ ' + String(e)); toast.err('Strapi 匯入失敗') }
    finally { setBusy(false) }
  }

  const dbByKind = (k: string) => dbRows.filter((r) => r.kind === k)
  const hasDb = dbRows.length > 0

  return (
    <div className="panel">
      <h2>站台範本（押註 / 作者 / 文稿預設）</h2>
      <div className={`source-banner ${hasDb ? 'db' : 'builtin'}`}>
        {hasDb
          ? `目前 DB 有 ${dbRows.length} 筆 Strapi 匯入的設定，實際以 DB 為準。`
          : '目前 DB 沒有 Strapi 設定 → 全部使用下方「內建預設」。看完內建夠不夠用，再決定要不要開 Strapi 匯入。'}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="ghost" disabled={busy} onClick={runImport}>{busy ? '匯入中…' : '從 Strapi 匯入 DB'}</button>
          <span className="muted">{strapiMsg}</span>
        </div>
      </div>

      <h3 className="sub-h">文稿類型 → 押註對應（內建預設）</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>類型</th><th>開頭押註</th><th>結尾押註</th><th>作者 ID</th></tr></thead>
        <tbody>
          {builtin?.article_types.map((t) => (
            <tr key={t.key}><td>{t.name}</td><td>{t.header}</td><td>{t.footer}</td><td className="muted">{t.author_id ?? '—'}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3 className="sub-h">押註範本內容（內建預設）</h3>
      {builtin && Object.entries({ ...builtin.header_disclaimers, ...prefixKeys(builtin.footer_disclaimers, 'footer:') }).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div className="cmp-label">{k}</div>
          <div className="ro" dangerouslySetInnerHTML={{ __html: v }} />
        </div>
      ))}

      {hasDb && (
        <>
          <h3 className="sub-h">DB 現況（Strapi 匯入）</h3>
          {['author', 'header_disclaimer', 'footer_disclaimer', 'article_type_preset', 'default_content'].map((kind) => (
            dbByKind(kind).length > 0 && (
              <div key={kind} style={{ marginBottom: 6 }}>
                <div className="cmp-label">{kind}（{dbByKind(kind).length} 筆）</div>
                <pre className="log" style={{ fontSize: 11 }}>{JSON.stringify(dbByKind(kind).map((r) => r.key || r.value), null, 1).slice(0, 1200)}</pre>
              </div>
            )
          ))}
        </>
      )}
    </div>
  )
}

function prefixKeys(o: Record<string, string>, p: string): Record<string, string> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [p + k, v]))
}
