import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { BoardPanel } from '../Board'

// 看板用同源 fetch 取資料 + SSE;測試攔截 fetch,驗證渲染與建卡。
const BOARD = {
  id: 1, name: 'BD 內容部',
  columns: [
    { id: 1, name: '提案 Backlog', kind: 'backlog', position: 0, wip_limit: null },
    { id: 2, name: '待處理', kind: 'ready', position: 1, wip_limit: null },
    { id: 3, name: 'AI 處理中', kind: 'processing', position: 2, wip_limit: null },
  ],
  tasks: [
    { id: 10, board_id: 1, column_id: 1, position: 1, title: '數碼港新聞稿', type: 'article',
      description: '', assignee: 'Joey', creator: 'Joey', priority: 'high', due_date: null,
      source_url: '', source_file: '', article_type: 'press-release', supplier: '數碼港',
      header_disclaimer: '', footer_disclaimer: '', job_id: null, job: null,
      created_at: '2026-06-24T00:00:00', updated_at: '2026-06-24T00:00:00' },
  ],
}

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/board/stream')) {
      // SSE:回一個永不結束的空 body,避免測試掛住
      return { ok: true, body: null } as unknown as Response
    }
    const data = impl(url, init)
    return { ok: true, json: async () => data, text: async () => JSON.stringify(data) } as Response
  }) as typeof fetch
}

beforeEach(() => { localStorage.clear() })

describe('部門看板', () => {
  test('渲染欄位與卡片', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    expect(await screen.findByText('數碼港新聞稿')).toBeInTheDocument()
    expect(screen.getByText('提案 Backlog')).toBeInTheDocument()
    expect(screen.getByText('AI 處理中')).toBeInTheDocument()
    expect(screen.getByText('新聞稿 · 數碼港')).toBeInTheDocument()  // supplier 子標顯示
  })

  test('卡片顯示負責人與優先級', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('數碼港新聞稿')
    expect(screen.getByText(/Joey/)).toBeInTheDocument()
    expect(screen.getByText(/高/)).toBeInTheDocument()
  })

  test('新增卡：填標題送出會 POST /board/tasks', async () => {
    const posted: unknown[] = []
    mockFetch((url, init) => {
      if (url.endsWith('/board')) return BOARD
      if (url.endsWith('/board/tasks') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        posted.push(body)
        return { ...BOARD.tasks[0], id: 99, title: body.title, column_id: 2 }
      }
      return {}
    })
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('數碼港新聞稿')
    // 點「待處理」欄的新增卡(第二個 + 新增卡按鈕)
    const addBtns = screen.getAllByText('＋ 新增卡')
    fireEvent.click(addBtns[1])
    const input = await screen.findByPlaceholderText('工作標題…')
    fireEvent.change(input, { target: { value: '新工作項' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(posted.length).toBe(1))
    expect((posted[0] as { title: string }).title).toBe('新工作項')
    expect((posted[0] as { column_id: number }).column_id).toBe(2)
  })
})
