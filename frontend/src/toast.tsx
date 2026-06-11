import { useEffect, useState } from 'react'

type Toast = { id: number; kind: 'ok' | 'err' | 'info'; text: string }

let _push: ((t: Omit<Toast, 'id'>) => void) | null = null
let _seq = 0

export const toast = {
  ok: (text: string) => _push?.({ kind: 'ok', text }),
  err: (text: string) => _push?.({ kind: 'err', text }),
  info: (text: string) => _push?.({ kind: 'info', text }),
}

/** 掛一次在 App 根部；取代 alert() 的非阻斷通知。 */
export function Toasts() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    _push = (t) => {
      const id = ++_seq
      setItems((l) => [...l, { ...t, id }])
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), t.kind === 'err' ? 8000 : 4000)
    }
    return () => { _push = null }
  }, [])
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}>
          {t.kind === 'ok' ? '✓ ' : t.kind === 'err' ? '✕ ' : ''}{t.text}
        </div>
      ))}
    </div>
  )
}
