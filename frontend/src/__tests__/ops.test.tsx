import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CalendarPanel, ClientsPanel, CommandPanel } from '../Ops'

const COLS = [
  { id: 1, name: '需求進線', kind: 'backlog', position: 0, wip_limit: null },
  { id: 5, name: '待發佈 / 排程', kind: 'publish', position: 4, wip_limit: null },
  { id: 7, name: '已結案', kind: 'done', position: 6, wip_limit: null },
]
const mkTask = (over: Record<string, unknown>) => ({
  id: 1, board_id: 1, column_id: 1, position: 1, title: '測試卡', type: 'general',
  description: '', priority: 'normal', client: '', pipeline: 'A', item_type: '廣編稿',
  bd_owner: 'Alex', dm_owner: '', editor: 'Joe', contract_id: null, contract: null,
  channels: [], notes: '', draft_deadline: null, publish_deadline: null, published_urls: {},
  status: '', status_label: '', scheduled_publish_at: null, line_proof_url: '', draft_doc_url: '',
  site_published: false, takedown_date: null, banner_spec: '{}', placement_slot_id: '', exec_sheet_ref: '',
  assignee: '', creator: '', due_date: null, source_url: '', source_file: '',
  article_type: '', supplier: '', header_disclaimer: '', footer_disclaimer: '',
  job_id: null, job: null, created_at: '2026-07-01T00:00:00', updated_at: '2026-07-01T00:00:00', ...over,
})

const BOARD = {
  id: 1, name: 'Delivery 業務稿處理', columns: COLS, contracts: [],
  tasks: [
    mkTask({ id: 11, title: 'Binance 待結案廣編', client: 'Binance', status: 'awaiting_bd_close', status_label: '等待 BD 結案' }),
    mkTask({ id: 12, title: 'OKX 待上稿快訊', client: 'OKX', status: 'awaiting_upload', status_label: '等待上稿' }),
    mkTask({ id: 13, title: '排程卡', client: 'Nexo', status: 'scheduled', status_label: '已排程發佈', column_id: 5, scheduled_publish_at: '2026-07-15T02:00:00Z' }),
  ],
  meta: { item_types: {}, quota_categories: [], roles: { bd: [], dm: [], editor: [] }, statuses: [] },
}
const DIGEST = {
  generated_at: '2026-07-02T01:00:00Z', open_count: 3,
  human_action: { 'BD(回傳客戶)': [{ id: 11, title: 'Binance 待結案廣編', client: 'Binance', status: 'awaiting_bd_close', status_label: '等待 BD 結案' }] },
  due_today: [], overdue: [{ id: 12, title: 'OKX 待上稿快訊', client: 'OKX', status: 'awaiting_upload', status_label: '等待上稿', deadline: '2026-07-01T00:00:00Z', which: 'publish_deadline' }],
  scheduled_today: [], takedown_due: [],
  contract_alerts: [{ id: 1, client: 'OKX', name: '半年約', kind: 'quota_low', category: '廣編', total: 6, used: 5, remaining: 1 }],
  text: '☀️ 晨報',
}
const ACTS = [
  { id: 1, task_id: 12, actor: 'system', kind: 'status', detail: '等待上稿(隨狀態)', created_at: '2026-07-02T01:00:00Z', task_title: 'OKX 待上稿快訊', task_client: 'OKX' },
]
const CLIENTS = [
  {
    client: 'Binance 幣安',
    contracts: [{ id: 1, client: 'Binance 幣安', name: '2026 年約', mode: '年約', quota: { 廣編: 12 }, usage: { 廣編: { total: 12, used: 3, remaining: 9 } }, channels: '', notes: '', sheet_ref: 'Entry-合約!B3', start_date: null, end_date: null, created_at: '' }],
    open_tasks: [{ id: 11, title: 'Binance 待結案廣編', item_type: '廣編稿', pipeline: 'A', status: 'awaiting_bd_close', status_label: '等待 BD 結案', publish_deadline: null }],
    closed_count: 2,
    published: [{ task: 'Binance 舊稿', channel: 'website', url: 'https://example.com/a' }],
    placements: [{ id: 'hp-leaderboard', name: 'Area A 頂部橫幅 leaderboard', surface_name: '首頁', schedule: '2026/07/01–07/31', status: 'booked' }],
  },
]

function mockFetch() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const data = url.includes('/board/digest') ? DIGEST
      : url.includes('/board/activity') ? ACTS
      : url.includes('/board/stream') ? null
      : url.endsWith('/board') ? BOARD
      : url.includes('/clients') ? CLIENTS
      : {}
    if (url.includes('/board/stream')) return { ok: true, body: null } as unknown as Response
    return { ok: true, json: async () => data, text: async () => JSON.stringify(data) } as Response
  }) as typeof fetch
}

beforeEach(() => { localStorage.clear(); mockFetch() })

describe('營運指揮(新版展示層)', () => {
  test('指揮中心:總覽 / 待人雙佇列 / 預警 / 主理人動態', async () => {
    render(<MemoryRouter><CommandPanel /></MemoryRouter>)
    expect(await screen.findByText('🎛 指揮中心')).toBeInTheDocument()
    // 雙佇列(「待 BD」同時出現在統計卡與佇列標題)
    expect(screen.getAllByText(/待 BD/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/待編輯部/).length).toBeGreaterThanOrEqual(2)
    expect(await screen.findByText('Binance 待結案廣編')).toBeInTheDocument()
    expect(screen.getByText('OKX 待上稿快訊')).toBeInTheDocument()
    // 預警帶(逾期 + 合約額度)
    expect(await screen.findByText('🔴 逾期')).toBeInTheDocument()
    expect(screen.getByText(/額度剩 1/)).toBeInTheDocument()
    // AI 活動 feed
    expect(await screen.findByText('AI 主理人')).toBeInTheDocument()
    expect(screen.getByText(/等待上稿\(隨狀態\)/)).toBeInTheDocument()
    // Pipeline 健康
    expect(screen.getByText('📊 Pipeline 健康')).toBeInTheDocument()
  })

  test('客戶 360:合約額度條 / 進行中稿件 / 版位檔期', async () => {
    render(<MemoryRouter><ClientsPanel /></MemoryRouter>)
    expect(await screen.findByText('🤝 客戶 360')).toBeInTheDocument()
    expect(await screen.findAllByText('Binance 幣安')).toBeTruthy()
    expect(await screen.findByText('2026 年約')).toBeInTheDocument()
    expect(screen.getByText('3/12')).toBeInTheDocument()  // 額度 used/total
    expect(screen.getByText('Binance 待結案廣編')).toBeInTheDocument()
    expect(screen.getByText(/Area A 頂部橫幅/)).toBeInTheDocument()
  })

  test('發佈行事曆:月曆渲染 + 回到今天', async () => {
    render(<MemoryRouter><CalendarPanel /></MemoryRouter>)
    expect(await screen.findByText('📅 發佈行事曆')).toBeInTheDocument()
    const now = new Date()
    expect(screen.getByText(`${now.getFullYear()} 年 ${now.getMonth() + 1} 月`)).toBeInTheDocument()
    expect(screen.getByText(/回到今天/)).toBeInTheDocument()
    expect(screen.getByText('‹ 上個月')).toBeInTheDocument()
  })
})
