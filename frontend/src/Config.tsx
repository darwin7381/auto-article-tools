import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'
import {
  getAgent, getAgentDefault, getBuiltinTemplates, listAgents,
  listVersions, type Agent,
} from './api'
import { toast } from './toast'
import { VersionBar } from './VersionBar'

function str(o: Record<string, unknown>, k: string): string {
  return o[k] == null ? '' : String(o[k])
}

export function ConfigPanel() {
  return (
    <>
      <AgentConfig />
      <DisclaimerConfig />
      <BuiltinTemplates />
    </>
  )
}

/** AI Agent 設定：預設(seed) vs 現用 並排 + 版本管理（命名儲存/切換/刪除）。 */
function AgentConfig() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [base, setBase] = useState<Record<string, unknown>>({}) // seed live (fallback)
  const [cur, setCur] = useState<Record<string, unknown> | null>(null) // 編輯區
  const [def, setDef] = useState<Record<string, unknown> | null>(null) // seed 預設

  const load = () => listAgents().then((a) => { setAgents(a); if (!name && a[0]) open(a[0].name) }).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function open(n: string) {
    setName(n)
    const [b, d, vs] = await Promise.all([
      getAgent(n), getAgentDefault(n).catch(() => null), listVersions(`agent:${n}`).catch(() => null),
    ])
    setBase(b); setDef(d)
    const active = vs?.versions.find((v) => v.is_active)
    setCur(active ? { ...b, ...active.data } : b) // 有生效版本 → 編輯區顯示生效版本內容
  }
  function set(k: string, v: unknown) { setCur((c) => ({ ...(c ?? {}), [k]: v })) }
  function loadDefault() { if (def) { setCur((c) => ({ ...(c ?? {}), ...def })); toast.info('已把預設帶到右側,記得「儲存為新版本」才生效') } }

  const c = (cur ?? {}) as Record<string, unknown>
  const d = (def ?? {}) as Record<string, unknown>
  const diff = (k: string) => def != null && str(c, k) !== str(d, k)

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2>AI Agent 設定 — 預設 vs 現用 + 版本管理</h2>
      <div className="agent-chips">
        {agents.map((a) => (
          <button key={a.name} className={`chip-btn ${a.name === name ? 'on' : ''}`} onClick={() => open(a.name)}>{a.name}</button>
        ))}
      </div>

      {!cur ? <p className="muted">載入中…</p> : (
        <>
          <VersionBar scope={`agent:${name}`} fallbackLabel="seed 預設"
            getData={() => ({
              provider: c.provider, model: c.model, temperature: c.temperature,
              system_prompt: c.system_prompt, user_prompt: c.user_prompt,
            })}
            onLoad={(data) => setCur({ ...base, ...data })} />

          <div className="cmp-row">
            <div className="cmp-col def">
              <div className="cmp-label">預設 provider / model</div>
              <div className="ro">{str(d, 'provider')} / {str(d, 'model')}</div>
            </div>
            <div className="cmp-col cur">
              <div className="cmp-label">現用 provider / model {diff('model') && <span className="tag-diff">≠</span>}</div>
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

          <div className="row" style={{ marginTop: 12 }}>
            <button className="ghost" onClick={loadDefault}>把預設帶到右側</button>
            <button className="ghost" onClick={() => open(name)}>重新載入生效版</button>
            <span className="muted">編輯後用上方「＋ 儲存為新版本」命名保存(不會覆蓋舊版)</span>
          </div>
        </>
      )}
    </div>
  )
}

function CmpField({ label, dval, cval, diff, onChange, minH }: {
  label: string; dval: string; cval: string; diff: boolean; onChange: (v: string) => void; minH: number
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

/** 押註範本：可編輯 + 版本管理(同 agent)。 */
function DisclaimerConfig() {
  const [builtin, setBuiltin] = useState<Record<string, string>>({}) // 攤平的預設 {key: html}
  const [cur, setCur] = useState<Record<string, string>>({})
  const KEYS: { k: string; label: string }[] = [
    { k: 'header:sponsored', label: '廣編稿 開頭押註' },
    { k: 'header:press-release', label: '新聞稿 開頭押註' },
    { k: 'footer:sponsored', label: '廣編稿 結尾押註' },
  ]

  useEffect(() => {
    ;(async () => {
      const [bt, vs] = await Promise.all([getBuiltinTemplates(), listVersions('disclaimer').catch(() => null)])
      const flat: Record<string, string> = {
        'header:sponsored': bt.header_disclaimers.sponsored || '',
        'header:press-release': bt.header_disclaimers['press-release'] || '',
        'footer:sponsored': bt.footer_disclaimers.sponsored || '',
      }
      setBuiltin(flat)
      const active = vs?.versions.find((v) => v.is_active)
      setCur(active ? flatten(active.data) : flat)
    })()
  }, [])

  function flatten(data: Record<string, unknown>): Record<string, string> {
    const h = (data.header_disclaimers ?? {}) as Record<string, string>
    const f = (data.footer_disclaimers ?? {}) as Record<string, string>
    return { 'header:sponsored': h.sponsored || '', 'header:press-release': h['press-release'] || '', 'footer:sponsored': f.sponsored || '' }
  }
  function unflatten(c: Record<string, string>): Record<string, unknown> {
    return {
      header_disclaimers: { sponsored: c['header:sponsored'], 'press-release': c['header:press-release'] },
      footer_disclaimers: { sponsored: c['footer:sponsored'] },
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2>押註範本 — 預設 vs 現用 + 版本管理</h2>
      <VersionBar scope="disclaimer" fallbackLabel="內建預設"
        getData={() => unflatten(cur)} onLoad={(data) => setCur(flatten(data))} />
      {KEYS.map(({ k, label }) => {
        const diff = (builtin[k] || '') !== (cur[k] || '')
        return (
          <div key={k} className="cmp-row">
            <div className="cmp-col def">
              <div className="cmp-label">預設 {label}</div>
              <div className="ro" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(builtin[k] || '(無)') }} />
            </div>
            <div className="cmp-col cur">
              <div className="cmp-label">現用 {label} {diff && <span className="tag-diff">≠ 預設</span>}</div>
              <textarea value={cur[k] || ''} onChange={(e) => setCur((p) => ({ ...p, [k]: e.target.value }))} style={{ minHeight: 90 }} />
            </div>
          </div>
        )
      })}
      <p className="hint">［撰稿方名稱］會在發稿時自動替換成你填的供稿方。編輯後用上方「儲存為新版本」保存。</p>
    </div>
  )
}

/** 文稿類型 → 押註/作者 內建預設對照。 */
function BuiltinTemplates() {
  const [builtin, setBuiltin] = useState<Awaited<ReturnType<typeof getBuiltinTemplates>> | null>(null)
  useEffect(() => { getBuiltinTemplates().then(setBuiltin).catch(() => {}) }, [])

  return (
    <div className="panel">
      <h2>文稿類型 → 押註對應（內建預設）</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>類型</th><th>開頭押註</th><th>結尾押註</th><th>作者 ID</th></tr></thead>
        <tbody>
          {builtin?.article_types.map((t) => (
            <tr key={t.key}><td>{t.name}</td><td>{t.header}</td><td>{t.footer}</td><td className="muted">{t.author_id ?? '—'}</td></tr>
          ))}
        </tbody>
      </table></div>
      <p className="hint">押註可在上方「免責押註」用具名版本覆蓋(版本 &gt; 內建);這裡是內建預設對照。</p>
    </div>
  )
}
