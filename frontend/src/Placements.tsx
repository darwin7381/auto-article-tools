import { useState, useEffect } from 'react'

export interface PlacementSlot {
  id: string;
  surface: 'homepage' | 'newsletter' | 'line' | 'social';
  surfaceName: string;
  name: string;
  size: string;
  format: string;
  maxKB: number | null;
  position: string;
  status: 'available' | 'negotiating' | 'booked';
  client: string;
  schedule: string;
}

const DEFAULT_PLACEMENTS: PlacementSlot[] = [
  // Homepage
  {
    id: 'hp-leaderboard',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area A 頂部橫幅 leaderboard',
    size: '728×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁最頂部導航欄下方橫幅',
    status: 'booked',
    client: 'Binance 幣安',
    schedule: '2026/07/01–07/31'
  },
  {
    id: 'hp-sidebar-1',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area B+ 側欄方塊',
    size: '650×650',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁右側欄最上層方塊廣告',
    status: 'negotiating',
    client: 'OKX',
    schedule: '2026/07/05–07/12'
  },
  {
    id: 'hp-sidebar-2',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area B 側欄方塊',
    size: '650×650',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁右側欄第二層方塊廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'hp-sidebar-3',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area C 側欄方塊下',
    size: '650×650',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁右側欄下方推薦文章旁廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'hp-content-1',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area D 內容區寬幅',
    size: '950×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁最新文章列表之中橫幅廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'hp-footer-1',
    surface: 'homepage',
    surfaceName: '首頁',
    name: 'Area E 頁尾寬幅',
    size: '950×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁底部分類欄位上方橫幅廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'hp-footer-banner',
    surface: 'homepage',
    surfaceName: '首頁',
    name: '頁尾 footer 橫幅',
    size: '728×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '首頁最底端版權宣告下方橫幅',
    status: 'available',
    client: '',
    schedule: ''
  },

  // Newsletter
  {
    id: 'nl-header',
    surface: 'newsletter',
    surfaceName: '電子報',
    name: 'Area A 信頭橫幅',
    size: '728×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '動區電子報信件最上方 Header 下橫幅',
    status: 'booked',
    client: 'Bybit',
    schedule: '2026/07/01–07/15'
  },
  {
    id: 'nl-body-1',
    surface: 'newsletter',
    surfaceName: '電子報',
    name: 'Area B 方塊一',
    size: '650×650',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '電子報左側或中段精選方塊廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'nl-body-2',
    surface: 'newsletter',
    surfaceName: '電子報',
    name: 'Area C 方塊二',
    size: '650×650',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '電子報後段精選方塊廣告',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'nl-inline-1',
    surface: 'newsletter',
    surfaceName: '電子報',
    name: 'Area D 內容內嵌橫幅',
    size: '950×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '電子報文章段落間寬幅廣告',
    status: 'available',
    client: '',
    schedule: ''
  },

  // Line@
  {
    id: 'line-menu',
    surface: 'line',
    surfaceName: 'Line@',
    name: '選單 (Rich Menu)',
    size: '—',
    format: '—',
    maxKB: null,
    position: 'Line 官方帳號聊天室下方固定六格選單置入',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'line-push',
    surface: 'line',
    surfaceName: 'Line@',
    name: '文字推播 (Text Push)',
    size: '—',
    format: '—',
    maxKB: null,
    position: 'Line 群發訊息文字推播置入',
    status: 'negotiating',
    client: 'Crypto.com',
    schedule: '2026/07/10'
  },
  {
    id: 'line-post',
    surface: 'line',
    surfaceName: 'Line@',
    name: '官方號帖文',
    size: '—',
    format: '—',
    maxKB: null,
    position: 'Line 官方號貼文牆 (VOOM) 置入帖文',
    status: 'available',
    client: '',
    schedule: ''
  },

  // Social & Distribution
  {
    id: 'soc-fb-cover',
    surface: 'social',
    surfaceName: '社群',
    name: 'Facebook 封面',
    size: '820×312',
    format: '圖片',
    maxKB: 300,
    position: 'Facebook 官方粉專主頁頂部封面置入',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'soc-fb-post',
    surface: 'social',
    surfaceName: '社群',
    name: 'Facebook 發布置入',
    size: '—',
    format: '—',
    maxKB: null,
    position: 'Facebook 每日重點新聞貼文贊助標記與置入',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'soc-tg-post',
    surface: 'social',
    surfaceName: '社群',
    name: 'Telegram 發布置入',
    size: '—',
    format: '—',
    maxKB: null,
    position: 'Telegram 新聞頻道推送貼文尾端置入廣告連結',
    status: 'available',
    client: '',
    schedule: ''
  },
  {
    id: 'soc-art-footer',
    surface: 'social',
    surfaceName: '社群',
    name: '文章末尾置入',
    size: '728×90',
    format: '圖片 / GIF',
    maxKB: 300,
    position: '官方網頁所有新聞文章最末尾固定橫幅廣告',
    status: 'available',
    client: '',
    schedule: ''
  }
];

interface PlacementsPanelProps {
  subTab: 'map' | 'specs' | 'schedule';
}

export function PlacementsPanel({ subTab }: PlacementsPanelProps) {
  // Persistence state
  const [placements, setPlacements] = useState<PlacementSlot[]>(() => {
    try {
      const saved = localStorage.getItem('pref:placements-data');
      return saved ? JSON.parse(saved) : DEFAULT_PLACEMENTS;
    } catch {
      return DEFAULT_PLACEMENTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pref:placements-data', JSON.stringify(placements));
  }, [placements]);

  // Selected surface state for Map Tab
  const [selectedSurface, setSelectedSurface] = useState<'homepage' | 'newsletter' | 'line' | 'social'>('homepage');

  // Selected slot state for Map Tab (default to first slot of current surface)
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => {
    const defaultSlot = DEFAULT_PLACEMENTS.find(p => p.surface === 'homepage');
    return defaultSlot ? defaultSlot.id : '';
  });

  // Pitch mode (client-facing view)
  const [pitchMode, setPitchMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pref:placements-pitch-mode');
      return saved ? JSON.parse(saved) === true : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('pref:placements-pitch-mode', JSON.stringify(pitchMode));
  }, [pitchMode]);

  // Search and filter states for Specs Tab
  const [searchText, setSearchText] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Quick select slot of new surface when surface changes
  const handleSurfaceChange = (surf: 'homepage' | 'newsletter' | 'line' | 'social') => {
    setSelectedSurface(surf);
    const firstSlot = placements.find(p => p.surface === surf);
    if (firstSlot) {
      setSelectedSlotId(firstSlot.id);
    }
  };

  // Find currently selected slot details
  const selectedSlot = placements.find(p => p.id === selectedSlotId);

  // Stats calculation
  const totalSlotsCount = placements.length;
  const availableCount = placements.filter(p => p.status === 'available').length;
  const negotiatingCount = placements.filter(p => p.status === 'negotiating').length;
  const bookedCount = placements.filter(p => p.status === 'booked').length;

  // Handle slot booking status / client / schedule updates (management)
  const updateSlot = (id: string, updates: Partial<PlacementSlot>) => {
    setPlacements(prev =>
      prev.map(slot => (slot.id === id ? { ...slot, ...updates } : slot))
    );
  };

  // Status text map
  const statusLabelMap = {
    available: '可用',
    negotiating: '洽談中',
    booked: '已售'
  };

  // Filtered slots for Specs Table
  const filteredSlots = placements.filter(slot => {
    const matchesSearch =
      slot.name.toLowerCase().includes(searchText.toLowerCase()) ||
      slot.position.toLowerCase().includes(searchText.toLowerCase()) ||
      slot.client.toLowerCase().includes(searchText.toLowerCase());
    const matchesSurface = surfaceFilter === 'all' || slot.surface === surfaceFilter;
    const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
    return matchesSearch && matchesSurface && matchesStatus;
  });

  return (
    <div className="placements-container">
      {/* Dynamic Scoped CSS Styles for Visual Wireframes */}
      <style>{`
        .placements-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .placements-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .pitch-toggle-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: var(--muted);
          background: var(--panel);
          border: 1px solid var(--border-soft);
          padding: 6px 12px;
          border-radius: 8px;
          user-select: none;
          transition: var(--transition-fast);
        }

        .pitch-toggle-label:hover {
          border-color: var(--accent);
          color: var(--text);
        }

        .pitch-toggle-label input {
          width: auto;
          margin: 0;
          cursor: pointer;
        }

        .pitch-active {
          color: var(--accent) !important;
          border-color: color-mix(in srgb, var(--accent) 30%, var(--border-soft)) !important;
          box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 10%, transparent);
        }

        /* Status colors */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
        }
        .status-badge.available {
          background: rgba(46, 187, 119, 0.1);
          color: var(--accent);
          border-color: rgba(46, 187, 119, 0.2);
        }
        .status-badge.negotiating {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warn);
          border-color: rgba(245, 158, 11, 0.2);
        }
        .status-badge.booked {
          background: rgba(88, 166, 255, 0.1);
          color: var(--accent-2);
          border-color: rgba(88, 166, 255, 0.2);
        }

        /* 2-Column layout for Map */
        .map-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .map-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Wireframe Mockups wrapper */
        .wireframe-container {
          background: var(--panel-2);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 520px;
          position: relative;
          overflow: hidden;
        }

        .wireframe-mock {
          width: 100%;
          max-width: 680px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 12px;
          user-select: none;
        }

        /* General wireframe elements */
        .wf-rect {
          background: color-mix(in srgb, var(--muted) 8%, transparent);
          border: 1px dashed var(--border);
          border-radius: 4px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          font-size: 11px;
          transition: var(--transition-smooth);
        }

        /* Clickable Slot Element */
        .wf-slot {
          background: color-mix(in srgb, var(--muted) 4%, transparent);
          border: 2px solid var(--border);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          text-align: center;
          transition: var(--transition-smooth);
          position: relative;
          overflow: hidden;
        }

        .wf-slot:hover {
          transform: scale(1.015);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .wf-slot.slot-active {
          border-color: var(--accent);
          box-shadow: var(--accent-glow);
        }

        .wf-slot.status-available {
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
          background: color-mix(in srgb, var(--accent) 5%, transparent);
          color: var(--accent);
        }
        .wf-slot.status-available.slot-active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }

        .wf-slot.status-negotiating {
          border-color: color-mix(in srgb, var(--warn) 50%, var(--border));
          background: color-mix(in srgb, var(--warn) 5%, transparent);
          color: var(--warn);
        }
        .wf-slot.status-negotiating.slot-active {
          border-color: var(--warn);
          background: color-mix(in srgb, var(--warn) 12%, transparent);
        }

        .wf-slot.status-booked {
          border-color: color-mix(in srgb, var(--accent-2) 50%, var(--border));
          background: color-mix(in srgb, var(--accent-2) 5%, transparent);
          color: var(--accent-2);
        }
        .wf-slot.status-booked.slot-active {
          border-color: var(--accent-2);
          background: color-mix(in srgb, var(--accent-2) 12%, transparent);
        }

        .wf-slot-title {
          font-size: 11.5px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        
        .wf-slot-size {
          font-size: 9px;
          font-family: var(--mono);
          opacity: 0.8;
        }

        /* Specific Wireframe: Homepage */
        .wf-hp-header {
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid var(--border-soft);
        }

        .wf-hp-nav {
          display: flex;
          gap: 12px;
        }

        .wf-hp-nav-dot {
          width: 24px;
          height: 6px;
          background: var(--border);
          border-radius: 3px;
        }

        .wf-hp-hero {
          height: 90px;
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 10px;
        }

        .wf-hp-main-cols {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
        }

        .wf-hp-posts {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wf-hp-post-card {
          height: 48px;
          display: flex;
          gap: 8px;
          padding: 6px;
          border: 1px solid var(--border-soft);
          border-radius: 4px;
        }

        .wf-hp-post-thumb {
          width: 50px;
          height: 100%;
          background: color-mix(in srgb, var(--muted) 5%, transparent);
          border-radius: 3px;
        }

        .wf-hp-post-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          justify-content: center;
        }

        .wf-hp-line {
          height: 6px;
          background: var(--border);
          border-radius: 2px;
        }

        .wf-hp-line.title {
          width: 70%;
        }

        .wf-hp-line.desc {
          width: 45%;
        }

        .wf-hp-sidebar {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Specific Wireframe: Newsletter */
        .wf-nl-email {
          max-width: 440px;
          margin: 0 auto;
        }

        .wf-nl-header {
          text-align: center;
          padding: 12px;
          border-bottom: 2px solid var(--accent);
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.05em;
        }

        .wf-nl-hero {
          height: 100px;
          border: 1px solid var(--border-soft);
          border-radius: 4px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: flex-end;
          background: color-mix(in srgb, var(--panel-2) 60%, transparent);
        }

        .wf-nl-body-squares {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        /* Specific Wireframe: Line@ */
        .wf-line-phone {
          width: 290px;
          height: 480px;
          border: 8px solid #2d2d30;
          border-radius: 28px;
          background: #111113;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        .wf-phone-ear {
          width: 50px;
          height: 6px;
          background: #2d2d30;
          border-radius: 3px;
          position: absolute;
          top: -12px;
          left: calc(50% - 25px);
        }

        .wf-line-chat-header {
          height: 40px;
          background: #1e1e22;
          border-bottom: 1px solid #2d2d30;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 11.5px;
          font-weight: 600;
          color: #fff;
        }

        .wf-line-chat-body {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        .wf-line-bubble {
          max-width: 80%;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 11px;
          line-height: 1.4;
        }

        .wf-line-bubble.bot {
          align-self: flex-start;
          background: #2a2a2e;
          color: #e3e3e3;
          border-bottom-left-radius: 2px;
        }

        .wf-line-bubble.slot-bubble {
          align-self: flex-start;
          width: 80%;
          padding: 0;
          border: none;
          background: transparent;
        }

        .wf-line-menu-slot {
          height: 90px;
          border-top: 1px solid #2d2d30;
          background: #1e1e22;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 1px;
          padding: 2px;
        }

        .wf-line-menu-item {
          background: #2a2a2e;
          font-size: 8px;
          color: #a0a0a0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
        }

        /* Specific Wireframe: Social */
        .wf-soc-fb {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wf-soc-cover-container {
          position: relative;
          height: 120px;
          background: #1e1e22;
          border-radius: 6px;
        }

        .wf-soc-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--panel-2);
          border: 2px solid var(--panel);
          position: absolute;
          bottom: -16px;
          left: 16px;
          z-index: 2;
        }

        .wf-soc-feed {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
        }

        .wf-soc-column {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wf-soc-card {
          border: 1px solid var(--border-soft);
          border-radius: 6px;
          padding: 10px;
          background: var(--panel);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wf-soc-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wf-soc-card-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--border);
        }

        .wf-soc-card-title {
          font-size: 10px;
          font-weight: 700;
        }

        .wf-soc-card-sponsored {
          font-size: 8px;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* Detail Panel */
        .detail-panel {
          position: sticky;
          top: 0;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .detail-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        .detail-spec-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 16px;
          border-top: 1px solid var(--border-soft);
          padding-top: 16px;
        }

        .detail-spec-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .detail-spec-label {
          color: var(--muted);
        }

        .detail-spec-val {
          color: var(--text);
          font-weight: 500;
          text-align: right;
        }

        .detail-spec-val.mono {
          font-family: var(--mono);
          font-size: 12px;
        }

        .detail-edit-form {
          margin-top: 16px;
          border-top: 1px solid var(--border-soft);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-edit-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .detail-edit-row label {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Auto-save confirmation indicator */
        .save-indicator {
          font-size: 11px;
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          animation: fadeOut 2s forwards;
        }

        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Filter Controls in Specs Tab */
        .filter-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 16px;
        }

        .filter-field {
          flex: 1;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-field label {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Schedule Timeline styling */
        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .schedule-surface-group {
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 18px;
        }

        .schedule-surface-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 8px;
          color: var(--text);
        }

        .schedule-surface-title::before {
          content: '';
          width: 4px;
          height: 14px;
          background: var(--accent-2);
          border-radius: 2px;
        }

        .schedule-slots-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .schedule-slot-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--panel-2);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          transition: var(--transition-fast);
          font-size: 13px;
        }

        .schedule-slot-row:hover {
          border-color: var(--border);
          background: color-mix(in srgb, var(--panel-2) 80%, var(--panel));
        }

        .schedule-slot-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .schedule-slot-name {
          font-weight: 600;
          color: var(--text);
        }

        .schedule-slot-specs {
          font-size: 11px;
          color: var(--muted);
          display: flex;
          gap: 8px;
          font-family: var(--mono);
        }

        .schedule-booking-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .schedule-client-name {
          font-weight: 600;
          color: var(--text);
        }

        .schedule-dates {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--muted);
          background: var(--panel);
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-soft);
        }

        .schedule-quick-edit-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--muted);
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .schedule-quick-edit-btn:hover {
          color: var(--text);
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 5%, transparent);
        }
      `}</style>

      {/* Top Level KPI Metrics Strip */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-val">{totalSlotsCount}</div>
          <div className="stat-label">總廣告版位</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'color-mix(in srgb, var(--accent) 20%, var(--border-soft))' }}>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{availableCount}</div>
          <div className="stat-label">可用版位</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'color-mix(in srgb, var(--warn) 20%, var(--border-soft))' }}>
          <div className="stat-val" style={{ color: 'var(--warn)' }}>{negotiatingCount}</div>
          <div className="stat-label">洽談中檔期</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'color-mix(in srgb, var(--accent-2) 20%, var(--border-soft))' }}>
          <div className="stat-val" style={{ color: 'var(--accent-2)' }}>{bookedCount}</div>
          <div className="stat-label">已售出檔期</div>
        </div>
      </div>

      {/* Header and Presentation Toggle */}
      <div className="placements-header-actions">
        <div>
          {subTab === 'map' && (
            <div className="seg view-seg">
              <button className={selectedSurface === 'homepage' ? 'on' : ''} onClick={() => handleSurfaceChange('homepage')}>首頁 Web</button>
              <button className={selectedSurface === 'newsletter' ? 'on' : ''} onClick={() => handleSurfaceChange('newsletter')}>動區電子報</button>
              <button className={selectedSurface === 'line' ? 'on' : ''} onClick={() => handleSurfaceChange('line')}>Line@ 帳號</button>
              <button className={selectedSurface === 'social' ? 'on' : ''} onClick={() => handleSurfaceChange('social')}>社群 / 發布</button>
            </div>
          )}
        </div>
        <label className={`pitch-toggle-label ${pitchMode ? 'pitch-active' : ''}`}>
          <input
            type="checkbox"
            checked={pitchMode}
            onChange={(e) => setPitchMode(e.target.checked)}
          />
          💼 展示簡報模式 (隱藏客戶/檔期管理)
        </label>
      </div>

      {/* Rendering Sub-Tabs */}
      {subTab === 'map' && (
        <div className="map-layout">
          {/* Visual Interactive Map (Left) */}
          <div className="wireframe-container">
            {selectedSurface === 'homepage' && (
              <div className="wireframe-mock">
                {/* Topbar navigation mock */}
                <div className="wf-hp-header">
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--muted)' }}>BlockTempo</span>
                  <div className="wf-hp-nav">
                    <div className="wf-hp-nav-dot" />
                    <div className="wf-hp-nav-dot" />
                    <div className="wf-hp-nav-dot" />
                  </div>
                </div>

                {/* Slot Area A leaderboard */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'hp-leaderboard')?.status} ${selectedSlotId === 'hp-leaderboard' ? 'slot-active' : ''}`}
                  style={{ height: '42px' }}
                  onClick={() => setSelectedSlotId('hp-leaderboard')}
                >
                  <div className="wf-slot-title">Area A (頂部橫幅 Leaderboard)</div>
                  <div className="wf-slot-size">728 × 90</div>
                </div>

                {/* Hero / slider */}
                <div className="wf-hp-hero">
                  <div className="wf-rect">精選首圖 Slider</div>
                  <div className="wf-rect" style={{ fontSize: '10px' }}>熱門新聞排行</div>
                </div>

                {/* Main section: posts + sidebar */}
                <div className="wf-hp-main-cols">
                  <div className="wf-hp-posts">
                    <div className="wf-hp-post-card">
                      <div className="wf-hp-post-thumb" />
                      <div className="wf-hp-post-lines">
                        <div className="wf-hp-line title" />
                        <div className="wf-hp-line desc" />
                      </div>
                    </div>

                    {/* Slot Area D */}
                    <div
                      className={`wf-slot status-${placements.find(p => p.id === 'hp-content-1')?.status} ${selectedSlotId === 'hp-content-1' ? 'slot-active' : ''}`}
                      style={{ height: '36px' }}
                      onClick={() => setSelectedSlotId('hp-content-1')}
                    >
                      <div className="wf-slot-title">Area D (內容區寬幅)</div>
                      <div className="wf-slot-size">950 × 90</div>
                    </div>

                    <div className="wf-hp-post-card">
                      <div className="wf-hp-post-thumb" />
                      <div className="wf-hp-post-lines">
                        <div className="wf-hp-line title" />
                        <div className="wf-hp-line desc" />
                      </div>
                    </div>
                  </div>

                  <div className="wf-hp-sidebar">
                    {/* Slot Area B+ */}
                    <div
                      className={`wf-slot status-${placements.find(p => p.id === 'hp-sidebar-1')?.status} ${selectedSlotId === 'hp-sidebar-1' ? 'slot-active' : ''}`}
                      style={{ height: '64px' }}
                      onClick={() => setSelectedSlotId('hp-sidebar-1')}
                    >
                      <div className="wf-slot-title">Area B+ (側欄方塊)</div>
                      <div className="wf-slot-size">650 × 650</div>
                    </div>

                    {/* Slot Area B */}
                    <div
                      className={`wf-slot status-${placements.find(p => p.id === 'hp-sidebar-2')?.status} ${selectedSlotId === 'hp-sidebar-2' ? 'slot-active' : ''}`}
                      style={{ height: '64px' }}
                      onClick={() => setSelectedSlotId('hp-sidebar-2')}
                    >
                      <div className="wf-slot-title">Area B (側欄方塊)</div>
                      <div className="wf-slot-size">650 × 650</div>
                    </div>

                    {/* Slot Area C */}
                    <div
                      className={`wf-slot status-${placements.find(p => p.id === 'hp-sidebar-3')?.status} ${selectedSlotId === 'hp-sidebar-3' ? 'slot-active' : ''}`}
                      style={{ height: '64px' }}
                      onClick={() => setSelectedSlotId('hp-sidebar-3')}
                    >
                      <div className="wf-slot-title">Area C (側欄下)</div>
                      <div className="wf-slot-size">650 × 650</div>
                    </div>
                  </div>
                </div>

                {/* Slot Area E */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'hp-footer-1')?.status} ${selectedSlotId === 'hp-footer-1' ? 'slot-active' : ''}`}
                  style={{ height: '36px' }}
                  onClick={() => setSelectedSlotId('hp-footer-1')}
                >
                  <div className="wf-slot-title">Area E (頁尾寬幅)</div>
                  <div className="wf-slot-size">950 × 90</div>
                </div>

                {/* Slot Footer banner */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'hp-footer-banner')?.status} ${selectedSlotId === 'hp-footer-banner' ? 'slot-active' : ''}`}
                  style={{ height: '36px', borderStyle: 'solid' }}
                  onClick={() => setSelectedSlotId('hp-footer-banner')}
                >
                  <div className="wf-slot-title">頁尾 footer 橫幅</div>
                  <div className="wf-slot-size">728 × 90</div>
                </div>
              </div>
            )}

            {selectedSurface === 'newsletter' && (
              <div className="wireframe-mock wf-nl-email">
                <div className="wf-nl-header">動區 BlockTempo NEWSLETTER</div>

                {/* Slot Area A header banner */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'nl-header')?.status} ${selectedSlotId === 'nl-header' ? 'slot-active' : ''}`}
                  style={{ height: '42px' }}
                  onClick={() => setSelectedSlotId('nl-header')}
                >
                  <div className="wf-slot-title">Area A (信頭橫幅)</div>
                  <div className="wf-slot-size">728 × 90</div>
                </div>

                <div className="wf-nl-hero">
                  <div className="wf-hp-line title" style={{ width: '80%' }} />
                  <div className="wf-hp-line desc" style={{ width: '60%' }} />
                  <div className="wf-hp-line desc" style={{ width: '40%' }} />
                </div>

                {/* Area B & C square block */}
                <div className="wf-nl-body-squares">
                  <div
                    className={`wf-slot status-${placements.find(p => p.id === 'nl-body-1')?.status} ${selectedSlotId === 'nl-body-1' ? 'slot-active' : ''}`}
                    style={{ height: '90px' }}
                    onClick={() => setSelectedSlotId('nl-body-1')}
                  >
                    <div className="wf-slot-title">Area B (方塊一)</div>
                    <div className="wf-slot-size">650 × 650</div>
                  </div>

                  <div
                    className={`wf-slot status-${placements.find(p => p.id === 'nl-body-2')?.status} ${selectedSlotId === 'nl-body-2' ? 'slot-active' : ''}`}
                    style={{ height: '90px' }}
                    onClick={() => setSelectedSlotId('nl-body-2')}
                  >
                    <div className="wf-slot-title">Area C (方塊二)</div>
                    <div className="wf-slot-size">650 × 650</div>
                  </div>
                </div>

                {/* Slot Area D */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'nl-inline-1')?.status} ${selectedSlotId === 'nl-inline-1' ? 'slot-active' : ''}`}
                  style={{ height: '42px' }}
                  onClick={() => setSelectedSlotId('nl-inline-1')}
                >
                  <div className="wf-slot-title">Area D (內容內嵌橫幅)</div>
                  <div className="wf-slot-size">950 × 90</div>
                </div>
              </div>
            )}

            {selectedSurface === 'line' && (
              <div className="wf-line-phone">
                <div className="wf-phone-ear" />
                <div className="wf-line-chat-header">
                  <span>Line@ BlockTempo 動區動趨</span>
                </div>
                <div className="wf-line-chat-body">
                  <div className="wf-line-bubble bot">
                    👋 歡迎加入動區動趨官方 Line 帳號！為您提供即時區塊鏈與加密貨幣新聞。
                  </div>

                  {/* Line Push Slot */}
                  <div
                    className={`wf-slot wf-line-bubble slot-bubble status-${placements.find(p => p.id === 'line-push')?.status} ${selectedSlotId === 'line-push' ? 'slot-active' : ''}`}
                    style={{ padding: '8px' }}
                    onClick={() => setSelectedSlotId('line-push')}
                  >
                    <div className="wf-slot-title">文字推播 (Text Push)</div>
                    <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>對話訊息置入</div>
                  </div>

                  {/* Line Post Slot */}
                  <div
                    className={`wf-slot wf-line-bubble slot-bubble status-${placements.find(p => p.id === 'line-post')?.status} ${selectedSlotId === 'line-post' ? 'slot-active' : ''}`}
                    style={{ padding: '8px' }}
                    onClick={() => setSelectedSlotId('line-post')}
                  >
                    <div className="wf-slot-title">官方號帖文 (VOOM)</div>
                    <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>貼文置入</div>
                  </div>
                </div>

                {/* Line Rich Menu Slot */}
                <div
                  className={`wf-slot status-${placements.find(p => p.id === 'line-menu')?.status} ${selectedSlotId === 'line-menu' ? 'slot-active' : ''}`}
                  style={{ height: '90px', borderRadius: '0 0 20px 20px', borderStyle: 'solid none none none' }}
                  onClick={() => setSelectedSlotId('line-menu')}
                >
                  <div className="wf-slot-title">選單 (Rich Menu)</div>
                  <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>聊天室底端六格選單</div>
                </div>
              </div>
            )}

            {selectedSurface === 'social' && (
              <div className="wireframe-mock wf-soc">
                {/* FB Cover Slot */}
                <div className="wf-soc-cover-container">
                  <div
                    className={`wf-slot status-${placements.find(p => p.id === 'soc-fb-cover')?.status} ${selectedSlotId === 'soc-fb-cover' ? 'slot-active' : ''}`}
                    style={{ height: '100%', borderRadius: '6px' }}
                    onClick={() => setSelectedSlotId('soc-fb-cover')}
                  >
                    <div className="wf-slot-title">Facebook 粉專封面</div>
                    <div className="wf-slot-size">820 × 312</div>
                  </div>
                  <div className="wf-soc-avatar" />
                </div>

                <div className="wf-soc-feed">
                  <div className="wf-soc-column">
                    {/* FB post insertion slot */}
                    <div className="wf-soc-card">
                      <div className="wf-soc-card-header">
                        <div className="wf-soc-card-avatar" />
                        <div className="wf-soc-card-title">BlockTempo 動區動趨</div>
                        <span className="wf-soc-card-sponsored">Sponsored</span>
                      </div>
                      <div className="wf-hp-line" style={{ width: '90%' }} />
                      <div className="wf-hp-line" style={{ width: '40%' }} />
                      <div
                        className={`wf-slot status-${placements.find(p => p.id === 'soc-fb-post')?.status} ${selectedSlotId === 'soc-fb-post' ? 'slot-active' : ''}`}
                        style={{ height: '80px' }}
                        onClick={() => setSelectedSlotId('soc-fb-post')}
                      >
                        <div className="wf-slot-title">Facebook 發布置入</div>
                        <div className="wf-slot-size">貼文置入 / 合作</div>
                      </div>
                    </div>
                  </div>

                  <div className="wf-soc-column">
                    {/* TG Post Card */}
                    <div className="wf-soc-card" style={{ background: '#1c252e', borderColor: '#2b3945' }}>
                      <div className="wf-soc-card-header">
                        <div className="wf-soc-card-avatar" style={{ background: '#54b3e6' }} />
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff' }}>BlockTempo 幣圈晨報</span>
                      </div>
                      <div className="wf-hp-line" style={{ width: '95%', background: '#455667' }} />
                      <div className="wf-hp-line" style={{ width: '80%', background: '#455667' }} />
                      <div
                        className={`wf-slot status-${placements.find(p => p.id === 'soc-tg-post')?.status} ${selectedSlotId === 'soc-tg-post' ? 'slot-active' : ''}`}
                        style={{ height: '40px', borderColor: '#54b3e6' }}
                        onClick={() => setSelectedSlotId('soc-tg-post')}
                      >
                        <div className="wf-slot-title" style={{ fontSize: '10px' }}>Telegram 推播置入</div>
                      </div>
                    </div>

                    {/* Article Post Footer Placement */}
                    <div className="wf-soc-card" style={{ padding: '8px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 600 }}>文章末尾</span>
                      <div className="wf-hp-line" style={{ width: '90%' }} />
                      <div
                        className={`wf-slot status-${placements.find(p => p.id === 'soc-art-footer')?.status} ${selectedSlotId === 'soc-art-footer' ? 'slot-active' : ''}`}
                        style={{ height: '36px', marginTop: '6px' }}
                        onClick={() => setSelectedSlotId('soc-art-footer')}
                      >
                        <div className="wf-slot-title" style={{ fontSize: '10px' }}>文章末尾置入</div>
                        <div className="wf-slot-size">728 × 90</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Details & Edit Panel (Right) */}
          <div className="panel detail-panel">
            {selectedSlot ? (
              <div>
                <div className="detail-header">
                  <div>
                    <span className="muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                      {selectedSlot.surfaceName} 載體
                    </span>
                    <h3 style={{ marginTop: '2px' }}>{selectedSlot.name}</h3>
                  </div>
                  <span className={`status-badge ${selectedSlot.status}`}>
                    {statusLabelMap[selectedSlot.status]}
                  </span>
                </div>

                <div className="detail-spec-grid">
                  <div className="detail-spec-item">
                    <span className="detail-spec-label">尺寸</span>
                    <span className="detail-spec-val mono">{selectedSlot.size}</span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="detail-spec-label">格式規格</span>
                    <span className="detail-spec-val">{selectedSlot.format}</span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="detail-spec-label">檔案大小上限</span>
                    <span className="detail-spec-val mono">
                      {selectedSlot.maxKB ? `≤ ${selectedSlot.maxKB} KB` : '—'}
                    </span>
                  </div>
                  <div className="detail-spec-item" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span className="detail-spec-label">曝光位置說明</span>
                    <span className="detail-spec-val" style={{ textAlign: 'left', fontSize: '12.5px', marginTop: '2px' }}>
                      {selectedSlot.position}
                    </span>
                  </div>
                </div>

                {/* Management Form (Hidden in Pitch Mode) */}
                {!pitchMode ? (
                  <div className="detail-edit-form">
                    <div className="detail-edit-row">
                      <label>檔期狀態</label>
                      <select
                        value={selectedSlot.status}
                        onChange={(e) => updateSlot(selectedSlot.id, { status: e.target.value as any })}
                      >
                        <option value="available">可用 可銷售</option>
                        <option value="negotiating">洽談中</option>
                        <option value="booked">已售出</option>
                      </select>
                    </div>

                    <div className="detail-edit-row">
                      <label>目前客戶名稱</label>
                      <input
                        type="text"
                        value={selectedSlot.client}
                        placeholder="例如: Binance 幣安"
                        onChange={(e) => updateSlot(selectedSlot.id, { client: e.target.value })}
                      />
                    </div>

                    <div className="detail-edit-row">
                      <label>預定檔期區間</label>
                      <input
                        type="text"
                        value={selectedSlot.schedule}
                        placeholder="例如: 2026/07/01–07/31"
                        onChange={(e) => updateSlot(selectedSlot.id, { schedule: e.target.value })}
                      />
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: '11px' }}>編輯即時自動存檔</span>
                      <span className="save-indicator">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        已儲存
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Pitch Mode client info */
                  (selectedSlot.status === 'booked' || selectedSlot.status === 'negotiating') && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                      <div className="banner" style={{ margin: 0, padding: '10px 12px', fontSize: '12px' }}>
                        🔒 該版位此檔期正在洽談或已被預定。詳細銷售空檔與套裝報價，請聯繫 BD 團隊獲取最新資訊。
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>
                請在左側地圖中點選廣告版位以查看詳細規格
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'specs' && (
        <div className="specs-layout">
          {/* Filter Bar */}
          <div className="filter-controls">
            <div className="filter-field" style={{ flex: 2 }}>
              <label>搜尋版位或客戶</label>
              <input
                type="text"
                placeholder="搜尋名稱、說明、客戶..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>載體篩選</label>
              <select value={surfaceFilter} onChange={(e) => setSurfaceFilter(e.target.value)}>
                <option value="all">全部載體</option>
                <option value="homepage">首頁 Web</option>
                <option value="newsletter">動區電子報</option>
                <option value="line">Line@ 帳號</option>
                <option value="social">社群 / 發布</option>
              </select>
            </div>
            <div className="filter-field">
              <label>狀態篩選</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">全部狀態</option>
                <option value="available">可用</option>
                <option value="negotiating">洽談中</option>
                <option value="booked">已售</option>
              </select>
            </div>
          </div>

          {/* Specs Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>版位名稱</th>
                  <th>載體</th>
                  <th>尺寸 (px)</th>
                  <th>規格格式</th>
                  <th>狀態</th>
                  {!pitchMode && <th>客戶</th>}
                  {!pitchMode && <th>預定檔期</th>}
                  <th>檔案上限</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.length > 0 ? (
                  filteredSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td style={{ fontWeight: '600' }}>
                        <div>{slot.name}</div>
                        <div className="muted" style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '2px' }}>
                          {slot.position}
                        </div>
                      </td>
                      <td>
                        <span className="meta-badge">{slot.surfaceName}</span>
                      </td>
                      <td className="mono">{slot.size}</td>
                      <td>{slot.format}</td>
                      <td>
                        <span className={`status-badge ${slot.status}`}>
                          {statusLabelMap[slot.status]}
                        </span>
                      </td>
                      {!pitchMode && (
                        <td style={{ fontWeight: slot.client ? '600' : 'normal' }}>
                          {slot.client || <span className="muted">—</span>}
                        </td>
                      )}
                      {!pitchMode && (
                        <td className="mono">
                          {slot.schedule || <span className="muted">—</span>}
                        </td>
                      )}
                      <td className="mono">{slot.maxKB ? `${slot.maxKB} KB` : '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={pitchMode ? 6 : 8} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                      沒有找到符合篩選條件的廣告版位。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'schedule' && (
        <div className="schedule-layout">
          {/* Pitch Mode Alert */}
          {pitchMode && (
            <div className="banner" style={{ background: 'rgba(88, 166, 255, 0.1)', borderColor: 'rgba(88, 166, 255, 0.3)', color: 'var(--accent-2)', marginBottom: '20px' }}>
              ℹ️ 目前為「展示簡報模式」，已隱藏敏感客戶名稱與排期編輯。關閉上方展示模式即可編輯檔期。
            </div>
          )}

          <div className="schedule-list">
            {(['homepage', 'newsletter', 'line', 'social'] as const).map((surf) => {
              const surfSlots = placements.filter(p => p.surface === surf);
              const surfName = surfSlots[0]?.surfaceName || surf;

              return (
                <div key={surf} className="schedule-surface-group">
                  <div className="schedule-surface-title">{surfName} 載體檔期</div>
                  
                  <div className="schedule-slots-grid">
                    {surfSlots.map((slot) => (
                      <div key={slot.id} className="schedule-slot-row">
                        <div className="schedule-slot-info">
                          <span className="schedule-slot-name">{slot.name}</span>
                          <div className="schedule-slot-specs">
                            <span>尺寸: {slot.size}</span>
                            <span>•</span>
                            <span>格式: {slot.format}</span>
                          </div>
                        </div>

                        <div className="schedule-booking-info">
                          <span className={`status-badge ${slot.status}`}>
                            {statusLabelMap[slot.status]}
                          </span>

                          {slot.status !== 'available' && !pitchMode && (
                            <>
                              <span className="schedule-client-name">{slot.client}</span>
                              <span className="schedule-dates">{slot.schedule}</span>
                            </>
                          )}

                          {slot.status === 'available' && !pitchMode && (
                            <span className="muted" style={{ fontSize: '12px' }}>開放銷售中</span>
                          )}

                          {!pitchMode && (
                            <button
                              className="schedule-quick-edit-btn"
                              onClick={() => {
                                // Jump back to Map tab and select this slot for editing
                                handleSurfaceChange(slot.surface);
                                setSelectedSlotId(slot.id);
                                // Force scroll to map area if needed
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              title="到地圖中編輯此版位檔期"
                            >
                              編輯
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
