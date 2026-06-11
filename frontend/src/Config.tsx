import { useEffect, useState } from 'react'
import {
  getAgent,
  getAgentDefault,
  importStrapi,
  listAgents,
  resetAgent,
  updateAgent,
  type Agent,
} from './api'

function str(o: Record<string, unknown>, k: string): string {
  return o[k] == null ? '' : String(o[k])
}

export function ConfigPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [cur, setCur] = useState<Record<string, unknown> | null>(null)
  const [def, setDef] = useState<Record<string, unknown> | null>(null)
  const [showDefault, setShowDefault] = useState(false)
  const [msg, setMsg] = useState('')
  const [strapiMsg, setStrapiMsg] = useState('')

  const load = () => listAgents().then(setAgents).catch(() => {})
  useEffect(() => { load() }, [])

  async function open(n: string) {
    setName(n); setMsg(''); setShowDefault(false)
    const [c, d] = await Promise.all([getAgent(n), getAgentDefault(n).catch(() => null)])
    setCur(c); setDef(d)
  }
  function set(k: string, v: unknown) { setCur((c) => ({ ...(c ?? {}), [k]: v })) }

  async function save() {
    if (!cur) return
    setMsg('儲存中…')
    await updateAgent(name, {
      provider: cur.provider, model: cur.model, temperature: cur.temperature,
      system_prompt: cur.system_prompt, user_prompt: cur.user_prompt,
    })
    setMsg('✓ 已儲存到 DB'); load()
  }
  async function reload() { setCur(await getAgent(name)); setMsg('已重新載入 DB 版本') }
  async function reset() {
    if (!confirm('重置回 seed 預設（從 R2 匯出的真值）？會覆蓋目前 DB 內容。')) return
    setCur(await resetAgent(name)); setMsg('✓ 已重置為預設'); load()
  }
  function applyDefaultToEditor() {
    if (def) { setCur((c) => ({ ...(c ?? {}), ...def })); setMsg('已把預設帶入編輯區（尚未儲存）') }
  }
  async function runStrapi() {
    setStrapiMsg('匯入中…（需本機 Strapi 開著）')
    try { const o = await importStrapi(); setStrapiMsg('✓ ' + JSON.stringify(o.imported)) }
    catch (e) { setStrapiMsg('✗ ' + String(e)) }
  }

  const c = (cur ?? {}) as Record<string, unknown>
  const d = (def ?? {}) as Record<string, unknown>
  const diff = (k: string) => def && str(c, k) !== str(d, k)

  return (
    <div className="grid">
      <div className="panel">
        <h2>Agents（設定存 DB）</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>名稱</th><th>model</th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.name} className={`click ${a.name === name ? 'sel' : ''}`} onClick={() => open(a.name)}>
                <td>{a.name}</td><td className="muted">{a.model}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="banner" style={{ marginTop: 16 }}>
          Strapi 設定遷移（作者 / 頁首頁尾免責 / 預設）
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost" onClick={runStrapi}>從 Strapi 匯入 DB</button>
            <span className="muted">{strapiMsg}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>編輯 {name || '—'}</h2>
        {!cur ? <p className="muted">點左邊一個 agent。</p> : (
          <>
            <div className="row">
              <label style={{ margin: 0 }}>provider / model</label>
              <span className="spacer" />
              {def && <button className="link" onClick={() => setShowDefault((v) => !v)}>{showDefault ? '隱藏預設對照' : '顯示預設(default)對照'}</button>}
            </div>
            <div className="row">
              <input type="text" value={str(c, 'provider')} onChange={(e) => set('provider', e.target.value)} style={{ flex: 1 }} />
              <input type="text" value={str(c, 'model')} onChange={(e) => set('model', e.target.value)} style={{ flex: 2 }} />
            </div>

            <label>system prompt {diff('system_prompt') && <span className="tag-diff">≠ 預設</span>}</label>
            <textarea value={str(c, 'system_prompt')} onChange={(e) => set('system_prompt', e.target.value)} style={{ minHeight: 140 }} />
            {showDefault && (
              <details open><summary className="muted">預設 system prompt（{str(d, 'system_prompt').length} 字）</summary>
                <pre className="log" style={{ color: '#9aa3b2' }}>{str(d, 'system_prompt').slice(0, 4000)}</pre>
              </details>
            )}

            <label>user prompt {diff('user_prompt') && <span className="tag-diff">≠ 預設</span>}</label>
            <textarea value={str(c, 'user_prompt')} onChange={(e) => set('user_prompt', e.target.value)} style={{ minHeight: 80 }} />
            {showDefault && (
              <details><summary className="muted">預設 user prompt</summary>
                <pre className="log" style={{ color: '#9aa3b2' }}>{str(d, 'user_prompt').slice(0, 2000)}</pre>
              </details>
            )}

            <div className="row" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={save}>儲存</button>
              <button className="ghost" onClick={reload}>重新載入 DB</button>
              <button className="ghost" onClick={reset}>重置為預設</button>
              {def && <button className="ghost" onClick={applyDefaultToEditor}>把預設帶入編輯區</button>}
              <span className="muted">{msg}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
