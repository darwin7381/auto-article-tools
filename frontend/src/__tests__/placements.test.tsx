import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test } from 'vitest'
import { PlacementsPanel, parseSchedule, normalizeSlot, getBookingLength, PLACEMENTS_SEED_VERSION } from '../Placements'

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

describe('normalizeSlot 持久化資料正規化', () => {
  test('沒有 id 回傳 null', () => {
    expect(normalizeSlot({})).toBeNull()
    expect(normalizeSlot(null)).toBeNull()
    expect(normalizeSlot({ id: '' })).toBeNull()
    expect(normalizeSlot('not-an-object')).toBeNull()
  })

  test('缺欄位 / 型別錯的欄位會補成安全預設(字串欄位不為 undefined)', () => {
    const r = normalizeSlot({ id: 'x1' })!
    expect(r).not.toBeNull()
    // 下游會對這些欄位呼叫 .toLowerCase()/.split(),必須是字串
    expect(typeof r.name).toBe('string')
    expect(typeof r.client).toBe('string')
    expect(typeof r.position).toBe('string')
    expect(typeof r.schedule).toBe('string')
    // 非法 surface/status 回退到合法列舉值
    expect(r.surface).toBe('homepage')
    expect(r.status).toBe('available')
    expect(r.hasMaterial).toBe(false)
  })

  test('型別錯的數值欄位(maxKB 為字串)→ null', () => {
    const r = normalizeSlot({ id: 'x1', maxKB: '300', surface: 'bogus', status: 'bogus' })!
    expect(r.maxKB).toBeNull()
    expect(r.surface).toBe('homepage')
    expect(r.status).toBe('available')
  })
})

describe('getBookingLength 檔期天數', () => {
  test('整月 07/01–07/31 = 31 天(含頭尾)', () => {
    expect(getBookingLength('2026/07/01–07/31')).toBe(31)
  })
  test('單日 = 1 天', () => {
    expect(getBookingLength('2026/07/10–07/10')).toBe(1)
  })
  test('空 / 無法解析 → null', () => {
    expect(getBookingLength('')).toBeNull()
    expect(getBookingLength('待定')).toBeNull()
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

  test('檔期頁有「回到今天」導覽,且列表檢視顯示檔期日期區間', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="schedule" />
      </MemoryRouter>
    )

    // 時間軸導覽不再是寫死三顆月份,要有「回到今天」
    expect(screen.getByText(/回到今天/)).toBeInTheDocument()

    // 列表檢視是甘特同資料的另一視圖 —— 必須看得到檔期日期區間
    // (示範資料含 Binance 整月 2026/07/01–07/31)
    expect(screen.getAllByText(/2026\/07\/01.*07\/31/).length).toBeGreaterThan(0)
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

  test('狀態看板「卡片欄位設定」齒輪會開啟欄位選擇彈窗', () => {
    render(
      <MemoryRouter>
        <PlacementsPanel subTab="board" />
      </MemoryRouter>
    )

    // 彈窗預設關閉
    expect(screen.queryByText('⚙️ 看板卡片顯示設定')).toBeNull()

    // 點齒輪開彈窗,出現可勾選的欄位清單
    fireEvent.click(screen.getByText(/卡片欄位設定/))
    expect(screen.getByText('⚙️ 看板卡片顯示設定')).toBeInTheDocument()
    expect(screen.getByText(/客戶名稱/)).toBeInTheDocument()
    expect(screen.getByText(/檔期日期區間/)).toBeInTheDocument()
    expect(screen.getByText(/素材就緒狀態/)).toBeInTheDocument()
  })

  test('看板對損壞的 localStorage 與孤兒卡片有防護', () => {
    // 設成目前 seed 版本,讓下方手動塞的資料會被讀取(而非被重新播種覆蓋)
    localStorage.setItem('pref:placements-seed-version', PLACEMENTS_SEED_VERSION)
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

  test('當日預覽對「不含預設 id」的持久化資料不崩(預覽頁寫死多個 slot id)', () => {
    localStorage.setItem('pref:placements-seed-version', PLACEMENTS_SEED_VERSION)
    // 持久化資料完全沒有 hp-leaderboard 等預覽頁寫死的 id
    localStorage.setItem('pref:placements-data', JSON.stringify([
      {
        id: 'custom-only', surface: 'homepage', surfaceName: '首頁', name: '自訂版位',
        size: '1×1', format: 'x', maxKB: null, position: 'p', status: 'available',
        client: '', schedule: '', hasMaterial: false,
      },
    ]))

    expect(() =>
      render(
        <MemoryRouter>
          <PlacementsPanel subTab="preview" />
        </MemoryRouter>
      )
    ).not.toThrow()

    expect(screen.getByText(/選擇預覽日期/)).toBeInTheDocument()
  })

  test('規格頁面對缺欄位的損壞版位資料不崩(下游有 .toLowerCase 等呼叫)', () => {
    localStorage.setItem('pref:placements-seed-version', PLACEMENTS_SEED_VERSION)
    // 只有 id、其餘欄位全缺 —— 正規化前會讓 slot.name.toLowerCase() 等爆炸
    localStorage.setItem('pref:placements-data', JSON.stringify([
      { id: 'broken-1' },
      { id: 'broken-2', name: 123, client: null, position: undefined, schedule: 999 },
    ]))

    // 規格頁的篩選器會對 name/position/client 呼叫 .toLowerCase();若沒正規化會 throw
    expect(() =>
      render(
        <MemoryRouter>
          <PlacementsPanel subTab="specs" />
        </MemoryRouter>
      )
    ).not.toThrow()

    expect(screen.getByPlaceholderText('搜尋名稱、說明、客戶...')).toBeInTheDocument()
  })

  test('後端有共享版位資料時,以伺服器為準(取代 localStorage 孤島)', async () => {
    const serverRows = [
      {
        id: 'srv-1', surface: 'homepage', surfaceName: '首頁', name: '伺服器版位',
        size: '728×90', format: '圖片', maxKB: 300, position: 'p', status: 'booked',
        client: '伺服器客戶Z', schedule: '2026/07/01–07/31', hasMaterial: true,
      },
    ]
    const origFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/placements') && (!init?.method || init.method === 'GET')) {
        return { ok: true, json: async () => serverRows } as Response
      }
      return { ok: true, json: async () => ({}) } as Response
    }) as typeof fetch

    try {
      render(
        <MemoryRouter>
          <PlacementsPanel subTab="specs" />
        </MemoryRouter>
      )
      // 初始是本地示範資料,GET 回來後切換成伺服器資料
      await screen.findByText('伺服器客戶Z')
      expect(screen.getByText('伺服器版位')).toBeInTheDocument()
    } finally {
      globalThis.fetch = origFetch
    }
  })

  test('seed 版本過舊時,既有使用者會被重新播種成新示範資料', () => {
    // 模擬既有使用者:舊版本 + 只剩一筆與新示範完全不同的舊資料
    localStorage.setItem('pref:placements-seed-version', '舊版本')
    localStorage.setItem('pref:placements-data', JSON.stringify([
      {
        id: 'hp-leaderboard', surface: 'homepage', surfaceName: '首頁', name: '舊版位',
        size: '1×1', format: 'x', maxKB: null, position: 'p', status: 'available',
        client: '舊客戶不該出現', schedule: '', hasMaterial: false,
      },
    ]))

    render(
      <MemoryRouter>
        <PlacementsPanel subTab="specs" />
      </MemoryRouter>
    )

    // 版本不符 → 重新播種:舊客戶消失,新示範資料(品牌客戶)出現
    expect(screen.queryByText('舊客戶不該出現')).toBeNull()
    expect(screen.getAllByText(/Binance|OKX|Bybit/).length).toBeGreaterThan(0)
  })
})
