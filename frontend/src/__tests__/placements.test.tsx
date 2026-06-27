import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { PlacementsPanel } from '../Placements'

describe('PlacementsPanel 廣告版位', () => {
  test('渲染 KPI 看板', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="map" />
      </MemoryRouter>
    )
    expect(screen.getByText('總廣告版位')).toBeInTheDocument()
    expect(screen.getByText('可用版位')).toBeInTheDocument()
    expect(screen.getByText('洽談中檔期')).toBeInTheDocument()
    expect(screen.getByText('已售出檔期')).toBeInTheDocument()
  })

  test('地圖模式顯示並且點選版位更新右側詳細資訊', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="map" />
      </MemoryRouter>
    )
    // 預設為首頁
    expect(screen.getByText('首頁 Web')).toBeInTheDocument()
    
    // 點選 Area A Leaderboard
    const slot = screen.getByText('Area A (頂部橫幅 Leaderboard)')
    fireEvent.click(slot)
    
    // 右側面板應顯示其資訊
    expect(screen.getAllByText('Area A 頂部橫幅 leaderboard').length).toBeGreaterThan(0)
    expect(screen.getByText('728×90')).toBeInTheDocument()
    expect(screen.getByText('首頁最頂部導航欄下方橫幅')).toBeInTheDocument()
  })

  test('規格表模式篩選功能', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="specs" />
      </MemoryRouter>
    )

    expect(screen.getByPlaceholderText('搜尋名稱、說明、客戶...')).toBeInTheDocument()
    expect(screen.getByText('尺寸 (px)')).toBeInTheDocument()
  })

  test('檔期管理模式顯示不同載體的版位檔期列表', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="schedule" />
      </MemoryRouter>
    )

    expect(screen.getByText('首頁 載體檔期')).toBeInTheDocument()
    expect(screen.getByText('電子報 載體檔期')).toBeInTheDocument()
    expect(screen.getByText('Line@ 載體檔期')).toBeInTheDocument()
    expect(screen.getByText('社群 載體檔期')).toBeInTheDocument()
  })

  test('檔期頁的「編輯」按鈕會導向地圖頁以開啟編輯表單', () => {
    const visited: string[] = []
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="schedule" onNavigate={(p) => visited.push(p)} />
      </MemoryRouter>
    )

    // 檔期頁本身沒有編輯表單,編輯按鈕必須跳回地圖頁才能編輯
    const editButtons = screen.getAllByRole('button', { name: '編輯' })
    expect(editButtons.length).toBeGreaterThan(0)
    fireEvent.click(editButtons[0])
    expect(visited).toContain('/placements')
  })
})
