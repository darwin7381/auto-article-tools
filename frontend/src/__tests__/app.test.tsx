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
})
