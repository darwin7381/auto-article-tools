import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { BoardPanel } from '../Board'

const COLS = [
  { id: 1, name: '需求進線', kind: 'backlog', position: 0, wip_limit: null },
  { id: 2, name: '待審 / 確認額度', kind: 'ready', position: 1, wip_limit: null },
  { id: 3, name: '製作中 / AI 轉稿', kind: 'processing', position: 2, wip_limit: null },
  { id: 7, name: '已結案', kind: 'done', position: 6, wip_limit: null },
]
const mkTask = (over: Partial<Record<string, unknown>>) => ({
  id: 10, board_id: 1, column_id: 1, position: 1, title: 'JPEX 廣編稿', type: 'article',
  description: '', priority: 'high', client: 'JPEX', pipeline: 'A', item_type: '廣編稿',
  bd_owner: 'Alex', dm_owner: 'Meg', editor: 'Joe', contract_id: null, contract: null,
  channels: [], notes: '', draft_deadline: null, publish_deadline: null, published_urls: {},
  assignee: '', creator: 'Meg', due_date: null, source_url: '', source_file: '',
  article_type: 'sponsored', supplier: 'JPEX', header_disclaimer: 'sponsored', footer_disclaimer: 'sponsored',
  job_id: null, job: null, created_at: '2026-06-24T00:00:00', updated_at: '2026-06-24T00:00:00', ...over,
})
const BOARD = {
  id: 1, name: 'Delivery 業務稿處理', columns: COLS, contracts: [],
  tasks: [mkTask({})],
  meta: { item_types: { 廣編稿: { pipeline: 'A', quota: '廣編', billable: true } }, quota_categories: ['廣編', '專訪'], roles: { bd: ['Alex'], dm: ['Meg'], editor: ['Joe'] } },
}

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/board/stream')) return { ok: true, body: null } as unknown as Response
    const data = impl(url, init)
    return { ok: true, json: async () => data, text: async () => JSON.stringify(data) } as Response
  }) as typeof fetch
}

beforeEach(() => { localStorage.clear() })

describe('Delivery 看板', () => {
  test('看板視圖渲染階段欄位與稿件卡(客戶/品項)', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    expect(await screen.findByText('JPEX 廣編稿')).toBeInTheDocument()
    expect(screen.getByText('需求進線')).toBeInTheDocument()
    expect(screen.getByText('製作中 / AI 轉稿')).toBeInTheDocument()
    expect(screen.getAllByText('JPEX').length).toBeGreaterThan(0)  // 客戶徽章
    expect(screen.getByText('廣編稿')).toBeInTheDocument()          // 品項
  })

  test('切換到表格視圖顯示欄位表頭', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('JPEX 廣編稿')
    fireEvent.click(screen.getByText('表格'))
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('品項')).toBeInTheDocument()
    expect(screen.getByText('主審')).toBeInTheDocument()
  })

  test('分組可切換成 Pipeline', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('JPEX 廣編稿')
    const groupSel = screen.getByDisplayValue('階段')
    fireEvent.change(groupSel, { target: { value: 'pipeline' } })
    expect(await screen.findByText('A · 廣編/快訊/新聞')).toBeInTheDocument()
  })

  test('篩選:Pipeline=B 時 A 稿件被濾掉', async () => {
    mockFetch((url) => (url.endsWith('/board') ? BOARD : {}))
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('JPEX 廣編稿')
    fireEvent.change(screen.getByDisplayValue('全部 Pipeline'), { target: { value: 'B' } })
    await waitFor(() => expect(screen.queryByText('JPEX 廣編稿')).not.toBeInTheDocument())
  })

  test('新增稿件 modal 送出會 POST /board/tasks', async () => {
    const posted: unknown[] = []
    mockFetch((url, init) => {
      if (url.endsWith('/board')) return BOARD
      if (url.endsWith('/board/tasks') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)); posted.push(body)
        return mkTask({ id: 99, title: body.title })
      }
      return {}
    })
    render(<BoardPanel onOpenJob={() => {}} />)
    await screen.findByText('JPEX 廣編稿')
    fireEvent.click(screen.getByText('＋ 新增稿件'))
    const input = await screen.findByPlaceholderText('稿件標題')
    fireEvent.change(input, { target: { value: 'CoinW 官網快訊' } })
    fireEvent.click(screen.getByText('建立稿件'))
    await waitFor(() => expect(posted.length).toBe(1))
    expect((posted[0] as { title: string }).title).toBe('CoinW 官網快訊')
  })
})
