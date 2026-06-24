import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import App from '../App'

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App 路由 + 側邊欄', () => {
  test('渲染側邊欄品牌與導覽', () => {
    renderAt('/')
    expect(screen.getByText('內容自動化')).toBeInTheDocument()
    expect(screen.getAllByText('處理稿件').length).toBeGreaterThan(0)
    expect(screen.getByText('建構進度')).toBeInTheDocument()
  })

  test('深連結 /status 直接顯示建構進度頁(topbar h1)', () => {
    renderAt('/status')
    expect(screen.getByRole('heading', { level: 1, name: '建構進度' })).toBeInTheDocument()
  })

  test('收合按鈕切換 shell.collapsed', () => {
    const { container } = renderAt('/')
    const shell = container.querySelector('.shell')!
    expect(shell.className).not.toContain('collapsed')
    fireEvent.click(screen.getByTitle('收合側邊欄'))
    expect(shell.className).toContain('collapsed')
  })

  test('點導覽切換頁面(處理稿件 → 建構進度)', () => {
    renderAt('/')
    const navBtns = Array.from(document.querySelectorAll('.nav-item'))
    const statusNav = navBtns.find((b) => /建構進度/.test(b.textContent || ''))!
    fireEvent.click(statusNav)
    expect(screen.getByRole('heading', { level: 1, name: '建構進度' })).toBeInTheDocument()
  })

  test('建構進度有可展開子頁(進入該區段自動展開)', () => {
    renderAt('/status')
    // 子項出現且可直接點
    for (const label of ['總覽', '模組搭建與測試', '稿件處理', '看板與協作', '使用說明 / API']) {
      expect(document.querySelector('.nav-children')).toBeTruthy()
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  test('深連結子頁 /status/docs 顯示使用說明 + API 文件', () => {
    renderAt('/status/docs')
    expect(screen.getByRole('heading', { level: 1, name: '建構進度' })).toBeInTheDocument()
    expect(screen.getByText('🔌 REST API')).toBeInTheDocument()
    expect(screen.getByText('⌨️ CLI 用法(在 backend/ 下)')).toBeInTheDocument()
  })

  test('深連結子頁 /status/board 顯示看板與協作', () => {
    renderAt('/status/board')
    expect(screen.getByText('📋 Delivery 跨部門業務線看板')).toBeInTheDocument()
    expect(screen.getByText('🧪 看板與協作測試')).toBeInTheDocument()
  })
})
