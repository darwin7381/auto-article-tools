import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test } from 'vitest'
import { PlacementsPanel, parseSchedule } from '../Placements'

// 元件會把狀態寫進 localStorage,測試間清乾淨避免互相污染
afterEach(() => localStorage.clear())

describe('parseSchedule 檔期字串解析', () => {
  test('空字串回傳 null', () => {
    expect(parseSchedule('')).toBeNull()
  })

  test('同年同字串短格式 YYYY/MM/DD–MM/DD', () => {
    const r = parseSchedule('2026/07/01–07/31')
    expect(r).not.toBeNull()
    expect(r!.start.getFullYear()).toBe(2026)
    expect(r!.start.getMonth()).toBe(6) // July = 6
    expect(r!.start.getDate()).toBe(1)
    expect(r!.end.getMonth()).toBe(6)
    expect(r!.end.getDate()).toBe(31)
  })

  test('完整起訖年月日 YYYY/MM/DD–YYYY/MM/DD', () => {
    const r = parseSchedule('2026/07/28–2026/08/04')
    expect(r).not.toBeNull()
    expect(r!.start.getMonth()).toBe(6)
    expect(r!.end.getMonth()).toBe(7) // August
    expect(r!.end.getDate()).toBe(4)
  })

  test('無法解析的字串回傳 null', () => {
    expect(parseSchedule('待定')).toBeNull()
  })
})

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

  test('當日預覽模式渲染與切換日期', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="preview" />
      </MemoryRouter>
    )

    // 應該要有選擇日期的文字
    expect(screen.getByText(/選擇預覽日期/)).toBeInTheDocument()
    expect(screen.getByText(/今天/)).toBeInTheDocument()
    expect(screen.getByText(/上一天/)).toBeInTheDocument()
    expect(screen.getByText(/下一天/)).toBeInTheDocument()
  })

  test('狀態看板模式渲染各生命週期階段與自訂管理', () => {
    const { container } = render(
      <MemoryRouter>
        <PlacementsPanel subTab="board" />
      </MemoryRouter>
    )

    // 預設狀態看板欄位應被渲染(限定欄位標頭,避免與卡片內 select 的 option 同字撞名)
    const colTitles = Array.from(
      container.querySelectorAll('.kanban-column-header')
    ).map((el) => el.textContent ?? '')
    expect(colTitles.some((t) => t.includes('洽談中'))).toBe(true)
    expect(colTitles.some((t) => t.includes('已安排'))).toBe(true)
    expect(colTitles.some((t) => t.includes('進行中'))).toBe(true)

    // 管理狀態欄位按鈕應存在
    const manageBtn = screen.getByText(/管理狀態欄位/)
    expect(manageBtn).toBeInTheDocument()
    
    // 點選展開設定
    fireEvent.click(manageBtn)
    expect(screen.getByText('自訂看板狀態欄位 (自左至右順序)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('輸入新狀態欄名稱...')).toBeInTheDocument()
  })

  test('看板對損壞的 localStorage 與孤兒卡片有防護', () => {
    // 損壞的 stages(存成物件而非字串陣列)→ 應回退預設,不崩、欄位照常出現
    localStorage.setItem('pref:placements-stages', JSON.stringify({ bad: true }))
    // 一筆 stage 指向不存在欄位的版位 → 不可消失,要落到第一欄
    localStorage.setItem('pref:placements-data', JSON.stringify([
      {
        id: 'orphan-1', surface: 'homepage', surfaceName: '首頁', name: '孤兒版位測試',
        size: '1×1', format: 'x', maxKB: null, position: 'p', status: 'booked',
        client: 'C', schedule: '', stage: '已被刪除的欄位', hasMaterial: false,
      },
    ]))

    const { container } = render(
      <MemoryRouter>
        <PlacementsPanel subTab="board" />
      </MemoryRouter>
    )

    // 回退到預設欄位(損壞值不會渲染空看板)
    const colTitles = Array.from(
      container.querySelectorAll('.kanban-column-header')
    ).map((el) => el.textContent ?? '')
    expect(colTitles.some((t) => t.includes('洽談中'))).toBe(true)

    // 孤兒卡片仍然出現(沒有靜默消失)
    expect(screen.getByText('孤兒版位測試')).toBeInTheDocument()
  })
})
