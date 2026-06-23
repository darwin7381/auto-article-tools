import { describe, expect, test } from 'vitest'
import { weightedProgress } from '../Stages'

type S = { id: string; status: 'pending' | 'running' | 'done' | 'error'; elapsedMs?: number }
const IDS = ['extract', 'content_ai', 'pr_writer', 'format_conversion', 'copy_editing', 'cover_image', 'article_formatting']
const mk = (statuses: Record<string, S['status']>, elapsed: Record<string, number> = {}): S[] =>
  IDS.map((id) => ({ id, status: statuses[id] ?? 'pending', elapsedMs: elapsed[id] }))

describe('weightedProgress — 時間加權,非「完成數/總數」', () => {
  test('全未開始 → 0', () => {
    expect(weightedProgress(mk({}))).toBe(0)
  })
  test('全完成 → 100', () => {
    expect(weightedProgress(mk(Object.fromEntries(IDS.map((i) => [i, 'done']))))).toBe(100)
  })
  test('只完成 extract(輕量階段)→ 遠低於 1/7=14%(時間加權,extract 佔比極小)', () => {
    const p = weightedProgress(mk({ extract: 'done' }, { extract: 600 }))
    expect(p).toBeLessThan(5) // 純階段數會顯示 14%,時間加權下 extract 幾乎不佔比 → ≈0
  })
  test('進行中階段隨已跑時間平滑前進(同一階段:跑越久 % 越高)', () => {
    const base = mk({ extract: 'done', content_ai: 'running' }, { extract: 600 })
    const early = weightedProgress(base, 5_000)   // content_ai 才跑 5s
    const later = weightedProgress(base, 40_000)  // 跑 40s
    expect(later).toBeGreaterThan(early)
  })
  test('進行中階段封頂(跑超久不會讓整體衝到 100)', () => {
    const p = weightedProgress(mk({ extract: 'done', content_ai: 'running' }, { extract: 600 }), 999_999)
    expect(p).toBeLessThanOrEqual(99)
  })
  test('未完成永遠 < 100', () => {
    const p = weightedProgress(mk(Object.fromEntries(IDS.slice(0, 6).map((i) => [i, 'done']))))
    expect(p).toBeLessThan(100)
  })
  test('出錯 → 回退為完成數比例', () => {
    expect(weightedProgress(mk({ extract: 'done', content_ai: 'error' }))).toBe(Math.round((1 / 7) * 100))
  })
})
