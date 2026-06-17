import { useEffect, useState } from 'react'
import { activateVersion, createVersion, deleteVersion, listVersions, type Version } from './api'
import { toast } from './toast'

/** 版本管理列：顯示目前生效版本、命名儲存、切換、刪除。agent 與押註共用。
 *  getData() 回傳要存成版本的目前編輯內容；onLoad(data) 把切換到的版本載回編輯區。 */
export function VersionBar({ scope, getData, onLoad, fallbackLabel }: {
  scope: string
  getData: () => Record<string, unknown>
  onLoad: (data: Record<string, unknown>) => void
  fallbackLabel: string // 沒有任何版本時顯示(例：「seed 預設」「內建預設」)
}) {
  const [versions, setVersions] = useState<Version[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  const reload = () => listVersions(scope).then((r) => { setVersions(r.versions); setActiveId(r.active_id) }).catch(() => {})
  useEffect(() => { reload() }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = versions.find((v) => v.id === activeId)

  async function save() {
    const name = newName.trim()
    if (!name) { toast.err('請輸入版本名稱'); return }
    try {
      await createVersion(scope, name, getData())
      toast.ok(`已儲存版本「${name}」並設為生效`)
      setNaming(false); setNewName(''); reload()
    } catch (e) { toast.err('儲存失敗：' + String(e)) }
  }
  async function act(v: Version) {
    try { await activateVersion(scope, v.id); onLoad(v.data); toast.ok(`已切換到「${v.name}」`); reload() }
    catch (e) { toast.err('切換失敗：' + String(e)) }
  }
  async function del(v: Version) {
    try { await deleteVersion(scope, v.id); toast.ok(`已刪除「${v.name}」`); setConfirmDel(null); reload() }
    catch (e) { toast.err('刪除失敗：' + String(e)) }
  }

  return (
    <div className="verbar">
      <div className="verbar-head">
        <span className="ver-now">
          目前生效：<b>{active ? active.name : fallbackLabel}</b>
          {versions.length > 0 && <span className="muted"> · 共 {versions.length} 個版本</span>}
        </span>
        <span className="spacer" />
        <button className="ghost" onClick={() => { setNaming((v) => !v); setNewName('') }}>＋ 儲存為新版本</button>
        {versions.length > 0 && <button className="link" onClick={() => setOpen((v) => !v)}>{open ? '收合' : '管理版本'}</button>}
      </div>

      {naming && (
        <div className="row" style={{ marginTop: 8 }}>
          <input type="text" value={newName} placeholder="版本名稱,例如：6/11 加強合規語氣"
            autoFocus onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }} style={{ flex: 1 }} />
          <button className="primary" style={{ width: 'auto', marginTop: 0 }} onClick={save}>儲存</button>
          <button className="link" onClick={() => setNaming(false)}>取消</button>
        </div>
      )}

      {open && versions.length > 0 && (
        <div className="ver-list">
          {versions.map((v) => (
            <div key={v.id} className={`ver-item ${v.is_active ? 'on' : ''}`}>
              <span className="ver-dot" />
              <span className="ver-name">{v.name}</span>
              {v.is_active && <span className="status done">生效中</span>}
              <span className="muted ver-time">{String(v.created_at).slice(5, 16).replace('T', ' ')}</span>
              <span className="spacer" />
              {!v.is_active && <button className="link" onClick={() => act(v)}>啟用</button>}
              {confirmDel === v.id
                ? <><span className="err" style={{ fontSize: 12 }}>確定?</span>
                    <button className="link err" onClick={() => del(v)}>刪除</button>
                    <button className="link" onClick={() => setConfirmDel(null)}>取消</button></>
                : <button className="link" onClick={() => setConfirmDel(v.id)}>刪除</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
