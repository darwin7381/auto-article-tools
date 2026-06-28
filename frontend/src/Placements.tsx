import { useState, useEffect, Fragment } from 'react'

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
  stage?: string; // Kanban lifecycle stage
  hasMaterial?: boolean; // Ad creative material status
  materialColor?: string; // Visual color for demo creative
  materialText?: string; // Visual text for demo creative
}

const SURFACES: PlacementSlot['surface'][] = ['homepage', 'newsletter', 'line', 'social'];
const STATUSES: PlacementSlot['status'][] = ['available', 'negotiating', 'booked'];
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

/**
 * Coerce an arbitrary persisted value into a well-typed PlacementSlot so malformed
 * localStorage (missing/wrong-typed fields) can never crash rendering downstream.
 * Returns null only when there is no usable id to key on.
 */
export function normalizeSlot(s: unknown): PlacementSlot | null {
  if (s == null || typeof s !== 'object') return null;
  const o = s as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id === '') return null;
  return {
    id: o.id,
    surface: SURFACES.includes(o.surface as PlacementSlot['surface']) ? (o.surface as PlacementSlot['surface']) : 'homepage',
    surfaceName: str(o.surfaceName),
    name: str(o.name, '(未命名版位)'),
    size: str(o.size),
    format: str(o.format),
    maxKB: typeof o.maxKB === 'number' ? o.maxKB : null,
    position: str(o.position),
    status: STATUSES.includes(o.status as PlacementSlot['status']) ? (o.status as PlacementSlot['status']) : 'available',
    client: str(o.client),
    schedule: str(o.schedule),
    stage: typeof o.stage === 'string' ? o.stage : undefined,
    hasMaterial: typeof o.hasMaterial === 'boolean' ? o.hasMaterial : false,
    materialColor: typeof o.materialColor === 'string' ? o.materialColor : undefined,
    materialText: typeof o.materialText === 'string' ? o.materialText : undefined,
  };
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
    schedule: '2026/07/01–07/31',
    stage: '進行中',
    hasMaterial: true,
    materialColor: '#F3BA2F',
    materialText: 'Binance'
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
    schedule: '2026/07/05–07/12',
    stage: '洽談中',
    hasMaterial: false,
    materialColor: '#EB6A1B',
    materialText: 'OKX'
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '2026/07/01–07/15',
    stage: '已安排',
    hasMaterial: false,
    materialColor: '#F0A818',
    materialText: 'Bybit'
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '2026/07/10',
    stage: '洽談中',
    hasMaterial: false,
    materialColor: '#103F91',
    materialText: 'Crypto.com'
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
    status: 'booked',
    client: 'Arbitrum',
    schedule: '2026/07/12–07/18',
    stage: '已安排',
    hasMaterial: true,
    materialColor: '#28A0F0',
    materialText: 'Arbitrum'
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
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
    schedule: '',
    stage: '可售 / 待洽談',
    hasMaterial: false
  }
];

const DEFAULT_STAGES = [
  '可售 / 待洽談',
  '洽談中',
  '安排中',
  '已安排',
  '已上架',
  '進行中',
  '結案準備',
  '已結案'
];

// Helper functions for date parsing and comparison
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function parseSchedule(scheduleStr: string): { start: Date; end: Date } | null {
  if (!scheduleStr) return null;
  const cleaned = scheduleStr.trim();
  const parts = cleaned.split(/[–-]/); // Handles both U+2013 – and ASCII hyphen -
  
  if (parts.length >= 2) {
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();

    const startParts = startStr.split('/');
    if (startParts.length < 3) return null;
    const startYear = parseInt(startParts[0], 10);
    const startMonth = parseInt(startParts[1], 10) - 1;
    const startDay = parseInt(startParts[2], 10);
    const startDate = new Date(startYear, startMonth, startDay);
    if (isNaN(startDate.getTime())) return null;

    const endParts = endStr.split('/');
    let endDate: Date;
    if (endParts.length >= 3) {
      const endYear = parseInt(endParts[0], 10);
      const endMonth = parseInt(endParts[1], 10) - 1;
      const endDay = parseInt(endParts[2], 10);
      endDate = new Date(endYear, endMonth, endDay);
    } else if (endParts.length === 2) {
      const endMonth = parseInt(endParts[0], 10) - 1;
      const endDay = parseInt(endParts[1], 10);
      endDate = new Date(startYear, endMonth, endDay);
    } else {
      const endDay = parseInt(endStr, 10);
      if (!isNaN(endDay)) {
        endDate = new Date(startYear, startMonth, endDay);
      } else {
        return null;
      }
    }

    if (isNaN(endDate.getTime())) return null;
    if (startDate > endDate) {
      return { start: endDate, end: startDate };
    }
    return { start: startDate, end: endDate };
  } else {
    // Single date format: YYYY/MM/DD
    const dateParts = cleaned.split('/');
    if (dateParts.length >= 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return { start: d, end: d };
      }
    }
  }
  return null;
}

export function isDateWithinPlacement(date: Date, slot: PlacementSlot): boolean {
  if (slot.status === 'available') return false;
  const range = parseSchedule(slot.schedule);
  if (!range) return false;
  
  const d = startOfDay(date).getTime();
  const s = startOfDay(range.start).getTime();
  const e = startOfDay(range.end).getTime();
  
  return d >= s && d <= e;
}

function getMaterialColor(slot: PlacementSlot): string {
  if (slot.materialColor) return slot.materialColor;
  if (slot.client.toLowerCase().includes('binance')) return '#F3BA2F';
  if (slot.client.toLowerCase().includes('bybit')) return '#F0A818';
  if (slot.client.toLowerCase().includes('okx')) return '#EB6A1B';
  if (slot.client.toLowerCase().includes('crypto')) return '#103F91';
  if (slot.client.toLowerCase().includes('arbitrum')) return '#28A0F0';
  const colors = ['#8247e5', '#00c087', '#e84142', '#f43f5e', '#3b82f6'];
  const index = Math.abs(slot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  return colors[index];
}

function getMaterialText(slot: PlacementSlot): string {
  if (slot.materialText) return slot.materialText;
  if (!slot.client) return 'AD';
  return slot.client.split(' ')[0].toUpperCase();
}

function getVisibleBookingRange(slot: PlacementSlot, year: number, month: number) {
  const range = parseSchedule(slot.schedule);
  if (!range || slot.status === 'available') return null;

  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  if (range.end < monthStart || range.start > monthEnd) {
    return null;
  }

  const start = range.start < monthStart ? monthStart : range.start;
  const end = range.end > monthEnd ? monthEnd : range.end;

  const startDay = start.getDate();
  const endDay = end.getDate();

  const isStartCap = range.start >= monthStart;
  const isEndCap = range.end <= monthEnd;

  return {
    startDay,
    endDay,
    isStartCap,
    isEndCap,
    client: slot.client,
    schedule: slot.schedule,
    hasMaterial: slot.hasMaterial,
    status: slot.status,
    color: getMaterialColor(slot),
    text: getMaterialText(slot)
  };
}

interface PlacementsPanelProps {
  subTab: 'map' | 'specs' | 'schedule' | 'preview' | 'board';
  onNavigate?: (path: string) => void;
}

export function PlacementsPanel({ subTab, onNavigate }: PlacementsPanelProps) {
  // Persistence state for placement slots.
  // Validate shape on load: must be a non-empty array of objects with an id,
  // otherwise fall back to defaults so a corrupted value can't break the page.
  const [placements, setPlacements] = useState<PlacementSlot[]>(() => {
    try {
      const saved = localStorage.getItem('pref:placements-data');
      if (!saved) return DEFAULT_PLACEMENTS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PLACEMENTS;
      // Normalize every entry so missing/wrong-typed fields get safe defaults.
      const valid = parsed.map(normalizeSlot).filter((s): s is PlacementSlot => s !== null);
      return valid.length > 0 ? valid : DEFAULT_PLACEMENTS;
    } catch {
      return DEFAULT_PLACEMENTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('pref:placements-data', JSON.stringify(placements));
  }, [placements]);

  // Persistence state for custom stages (Kanban lifecycles).
  // Validate shape on load: must be a non-empty array of non-empty unique strings,
  // otherwise fall back to defaults so a corrupted value can't render an empty board.
  const [stages, setStages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pref:placements-stages');
      if (!saved) return DEFAULT_STAGES;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEFAULT_STAGES;
      const cleaned = Array.from(
        new Set(parsed.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map(s => s.trim()))
      );
      return cleaned.length > 0 ? cleaned : DEFAULT_STAGES;
    } catch {
      return DEFAULT_STAGES;
    }
  });

  useEffect(() => {
    localStorage.setItem('pref:placements-stages', JSON.stringify(stages));
  }, [stages]);

  // Selected surface state for Map and Preview tabs
  const [selectedSurface, setSelectedSurface] = useState<'homepage' | 'newsletter' | 'line' | 'social'>('homepage');

  // Selected slot state for Map Tab (defaults to first slot of current surface)
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

  // Schedule subtab view toggle: 'calendar' (Gantt) vs 'list' (original list)
  const [scheduleViewMode, setScheduleViewMode] = useState<'calendar' | 'list'>('calendar');
  // Selected month string for Gantt chart
  const [selectedMonthStr, setSelectedMonthStr] = useState('2026/07');
  // Selected date filter for displaying details in calendar/Gantt mode (defaults to July 10, 2026)
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date>(() => new Date(2026, 6, 10));

  // Date Preview state: date string format (defaults to '2026-07-10')
  const [previewDateStr, setPreviewDateStr] = useState('2026-07-10');
  const previewDate = (() => {
    const parts = previewDateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  })();

  // Kanban states
  const [newStageName, setNewStageName] = useState('');
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [showStageSettings, setShowStageSettings] = useState(false);

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

  // Safe lookup for the preview tab's hardcoded slot ids: if persisted data is
  // missing that id (custom/malformed set), return an empty "available" placeholder
  // instead of crashing on a non-null assertion.
  const slotById = (id: string): PlacementSlot => placements.find(p => p.id === id) ?? normalizeSlot({ id })!;

  // Stats calculation
  const totalSlotsCount = placements.length;
  const availableCount = placements.filter(p => p.status === 'available').length;
  const negotiatingCount = placements.filter(p => p.status === 'negotiating').length;
  const bookedCount = placements.filter(p => p.status === 'booked').length;

  // Handle slot updates
  const updateSlot = (id: string, updates: Partial<PlacementSlot>) => {
    setPlacements(prev =>
      prev.map(slot => (slot.id === id ? { ...slot, ...updates } : slot))
    );
  };

  // Move card to a different stage (synced with status/client/schedule if appropriate)
  const handleMoveCard = (slotId: string, newStage: string) => {
    setPlacements(prev =>
      prev.map(slot => {
        if (slot.id !== slotId) return slot;
        
        let status = slot.status;
        let client = slot.client;
        let schedule = slot.schedule;
        let hasMaterial = slot.hasMaterial;
        
        if (newStage === '可售 / 待洽談') {
          status = 'available';
          client = '';
          schedule = '';
          hasMaterial = false;
        } else if (newStage === '洽談中') {
          status = 'negotiating';
          if (!client) client = '洽談中客戶';
          if (!schedule) schedule = '2026/07/10';
        } else {
          status = 'booked';
          if (!client) client = '預定客戶';
          if (!schedule) schedule = '2026/07/01–07/31';
        }
        
        return {
          ...slot,
          stage: newStage,
          status,
          client,
          schedule,
          hasMaterial
        };
      })
    );
  };

  // Add a new stage to lifecycle list
  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    if (stages.includes(newStageName.trim())) return;
    setStages(prev => [...prev, newStageName.trim()]);
    setNewStageName('');
  };

  // Delete stage from lifecycle list
  const handleDeleteStage = (stageName: string) => {
    // Never allow deleting the last remaining column (would leave an empty board).
    if (stages.length <= 1) return;
    const remaining = stages.filter(s => s !== stageName);
    setStages(remaining);
    // Move slots from the deleted stage into the first remaining column so none vanish.
    const fallback = remaining[0];
    setPlacements(prev =>
      prev.map(slot => slot.stage === stageName ? { ...slot, stage: fallback, status: 'available', client: '', schedule: '', hasMaterial: false } : slot)
    );
  };

  // Rename a stage
  const handleRenameStage = (index: number) => {
    if (!editingStageName.trim()) return;
    const oldName = stages[index];
    const newName = editingStageName.trim();
    if (oldName === newName) {
      setEditingStageIndex(null);
      return;
    }
    setStages(prev => prev.map((s, i) => i === index ? newName : s));
    setPlacements(prev =>
      prev.map(slot => slot.stage === oldName ? { ...slot, stage: newName } : slot)
    );
    setEditingStageIndex(null);
  };

  // Reset stages to default list
  const handleResetStages = () => {
    setStages(DEFAULT_STAGES);
    // Align all placements stages to match default mapping
    setPlacements(prev =>
      prev.map(slot => {
        let stage = slot.stage;
        if (!DEFAULT_STAGES.includes(stage || '')) {
          if (slot.status === 'available') stage = '可售 / 待洽談';
          else if (slot.status === 'negotiating') stage = '洽談中';
          else stage = '進行中';
        }
        return { ...slot, stage };
      })
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

  // Calculate dates of the selected month for Gantt rendering
  const [daysYear, daysMonth] = selectedMonthStr.split('/');
  const currentYear = parseInt(daysYear, 10);
  const currentMonth = parseInt(daysMonth, 10) - 1; // 0-indexed month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Formatting dates for preview inputs and timeline bars
  const fmtYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleDayShift = (days: number) => {
    const nextD = new Date(previewDate.getTime() + days * 24 * 60 * 60 * 1000);
    setPreviewDateStr(fmtYYYYMMDD(nextD));
  };

  return (
    <div className="placements-container">
      {/* Dynamic Scoped CSS Styles for Visual Wireframes & Previews */}
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

        /* Material status badges */
        .material-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .material-badge.ready {
          background: rgba(46, 187, 119, 0.08);
          color: var(--accent);
          border: 1px solid rgba(46, 187, 119, 0.2);
        }
        .material-badge.pending {
          background: rgba(245, 158, 11, 0.08);
          color: var(--warn);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        /* 2-Column layout for Map & Preview */
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

        /* Calendar / Gantt Timeline View styles */
        .gantt-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 20px;
        }

        .gantt-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .gantt-scroll-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          background: var(--panel-2);
        }

        .gantt-table {
          border-collapse: collapse;
          min-width: 900px;
          width: 100%;
        }

        .gantt-table th, .gantt-table td {
          border: 1px solid var(--border-soft);
          padding: 0;
          text-align: center;
        }

        .gantt-label-col {
          width: 180px;
          padding: 10px 14px !important;
          text-align: left !important;
          font-weight: 600;
          font-size: 12px;
          background: var(--panel);
          color: var(--text);
          position: sticky;
          left: 0;
          z-index: 10;
          box-shadow: 2px 0 5px rgba(0,0,0,0.1);
          border-right: 1px solid var(--border) !important;
        }

        .gantt-surface-row {
          background: var(--panel-2);
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left !important;
        }

        .gantt-surface-row td {
          padding: 6px 14px;
          background: var(--panel-2);
          text-align: left;
        }

        .gantt-day-header {
          width: 22px;
          height: 38px;
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          background: var(--panel);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .gantt-day-header:hover {
          background: var(--panel-2);
          color: var(--text);
        }

        .gantt-day-header.is-weekend {
          background: color-mix(in srgb, var(--border-soft) 30%, var(--panel));
        }

        .gantt-day-header.is-today {
          border-bottom: 2px solid var(--err);
          color: var(--err);
          font-weight: 700;
        }

        .gantt-day-cell {
          width: 22px;
          height: 32px;
          position: relative;
          cursor: pointer;
        }

        .gantt-day-cell.is-weekend {
          background: rgba(255, 255, 255, 0.015);
        }

        :root.light .gantt-day-cell.is-weekend {
          background: rgba(0, 0, 0, 0.015);
        }

        .gantt-day-cell.is-today::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          background: var(--err);
          opacity: 0.5;
          pointer-events: none;
        }

        .gantt-bar-segment {
          position: absolute;
          top: 6px;
          bottom: 6px;
          left: 0;
          right: -1px;
          z-index: 5;
          transition: var(--transition-fast);
          opacity: 0.85;
        }

        .gantt-bar-segment:hover {
          opacity: 1;
          transform: scaleY(1.1);
        }

        .gantt-bar-segment.booked {
          background: var(--accent-2);
          border-top: 1px solid color-mix(in srgb, var(--accent-2) 30%, #fff);
          border-bottom: 1px solid color-mix(in srgb, var(--accent-2) 30%, #000);
        }

        .gantt-bar-segment.negotiating {
          background: var(--warn);
          border-top: 1px solid color-mix(in srgb, var(--warn) 30%, #fff);
          border-bottom: 1px solid color-mix(in srgb, var(--warn) 30%, #000);
        }

        .gantt-bar-segment.start-cap {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
          left: 2px;
        }

        .gantt-bar-segment.end-cap {
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
          right: 2px;
        }

        .gantt-summary-panel {
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 18px;
          margin-top: 16px;
        }

        .gantt-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .gantt-summary-title {
          font-size: 13.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gantt-summary-stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
        }

        .gantt-legend {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--muted);
          margin-top: 12px;
          justify-content: flex-end;
        }

        .gantt-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gantt-legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .gantt-legend-color.booked {
          background: var(--accent-2);
        }

        .gantt-legend-color.negotiating {
          background: var(--warn);
        }

        /* Day Preview Styles */
        .preview-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .preview-date-picker-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .preview-date-picker-wrap input[type="date"] {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          padding: 6px 10px;
          font-size: 13px;
          outline: none;
        }

        .preview-btn {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .preview-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        .preview-ad-card {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 8px;
          box-sizing: border-box;
          transition: var(--transition-smooth);
        }

        .preview-creative {
          border-radius: 4px;
          color: #fff;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          gap: 4px;
          text-align: center;
        }

        .preview-stripe-bg {
          background-color: var(--panel-2);
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(245, 158, 11, 0.05) 10px,
            rgba(245, 158, 11, 0.05) 20px
          );
          border: 2px dashed var(--warn);
          border-radius: 6px;
          color: var(--warn);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          text-align: center;
        }

        .preview-open-bg {
          border: 2px dashed var(--accent);
          background: rgba(46, 187, 119, 0.02);
          border-radius: 6px;
          color: var(--accent);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          text-align: center;
          opacity: 0.75;
        }

        /* Kanban Styles */
        .kanban-board {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 12px;
          align-items: start;
        }

        .kanban-column {
          flex: 0 0 280px;
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 480px;
          max-height: 700px;
          overflow-y: auto;
          box-shadow: var(--shadow);
        }

        .kanban-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid var(--border-soft);
          padding-bottom: 8px;
          font-weight: 700;
          font-size: 13px;
          color: var(--text);
        }

        .kanban-column-count {
          font-size: 10.5px;
          font-family: var(--mono);
          background: var(--panel-2);
          border: 1px solid var(--border-soft);
          color: var(--muted);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .kanban-card {
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          cursor: grab;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: var(--transition-fast);
        }

        .kanban-card:active {
          cursor: grabbing;
        }

        .kanban-card:hover {
          border-color: var(--accent-2);
          transform: translateY(-1px);
          box-shadow: var(--shadow-hover);
        }

        .kanban-card-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .kanban-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--muted);
        }

        .kanban-settings-panel {
          background: var(--panel);
          border: 1px solid var(--border-soft);
          border-radius: var(--r);
          padding: 16px;
          margin-bottom: 16px;
        }

        .kanban-settings-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .kanban-settings-stage-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--panel-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12.5px;
        }

        .kanban-settings-stage-chip input {
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 12.5px;
          font-weight: 500;
          width: 90px;
          padding: 0;
          outline: none;
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
          {(subTab === 'map' || subTab === 'preview') && (
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

                {/* Currently booked / Availability visual block */}
                <div className="detail-status-card" style={{
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      目前檔期 / 銷售狀態
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {selectedSlot.status !== 'available' && (
                        <span className={`material-badge ${selectedSlot.hasMaterial ? 'ready' : 'pending'}`}>
                          {selectedSlot.hasMaterial ? '素材已就緒' : '等待素材'}
                        </span>
                      )}
                      <span className={`status-badge ${selectedSlot.status}`}>
                        {statusLabelMap[selectedSlot.status]}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>目前客戶</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                        {selectedSlot.status === 'available'
                          ? '—'
                          : pitchMode
                            ? selectedSlot.status === 'booked' ? '🔒 已預訂' : '⏳ 洽談中'
                            : selectedSlot.client || '—'
                        }
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>銷售檔期</span>
                      <span style={{ fontWeight: '500', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                        {selectedSlot.schedule || '開放中'}
                      </span>
                    </div>
                    {selectedSlot.stage && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--muted)' }}>看板階段</span>
                        <span style={{ fontWeight: '600', color: 'var(--accent-2)' }}>{selectedSlot.stage}</span>
                      </div>
                    )}
                  </div>

                  {/* Mini timeline bar */}
                  {selectedSlot.status !== 'available' && selectedSlot.schedule ? (
                    (() => {
                      const range = parseSchedule(selectedSlot.schedule);
                      if (!range) {
                        return (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '6px' }}>
                            檔期格式無法解析 (顯示原字串: {selectedSlot.schedule})
                          </div>
                        );
                      }
                      const winStart = new Date(range.start.getFullYear(), range.start.getMonth(), 1, 0, 0, 0, 0);
                      const winEnd = new Date(winStart.getTime() + 60 * 24 * 60 * 60 * 1000);
                      
                      const totalMs = winEnd.getTime() - winStart.getTime();
                      const startMs = startOfDay(range.start).getTime();
                      const endMs = startOfDay(range.end).getTime();
                      
                      const leftPercent = Math.max(0, ((startMs - winStart.getTime()) / totalMs) * 100);
                      const widthPercent = Math.min(100 - leftPercent, ((endMs - startMs + 24 * 60 * 60 * 1000) / totalMs) * 100);

                      const fmtMD = (d: Date) => {
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${m}/${day}`;
                      };

                      return (
                        <div className="mini-timeline-container" style={{ marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--muted)', marginBottom: '6px' }}>
                            <span>檔期視覺化 (近60天)</span>
                            <span>{fmtMD(range.start)} - {fmtMD(range.end)}</span>
                          </div>
                          <div className="mini-timeline-track" style={{
                            height: '8px',
                            background: 'var(--border-soft)',
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid var(--border)'
                          }}>
                            <div className="mini-timeline-bar" style={{
                              position: 'absolute',
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              height: '100%',
                              background: selectedSlot.status === 'booked' ? 'var(--accent-2)' : 'var(--warn)',
                              borderRadius: '4px',
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--mono)' }}>
                            <span>{fmtMD(winStart)}</span>
                            <span>{fmtMD(new Date(winStart.getFullYear(), winStart.getMonth() + 1, 1))}</span>
                            <span>{fmtMD(winEnd)}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="mini-timeline-container" style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--muted)', marginBottom: '6px' }}>
                        <span>檔期視覺化 (近60天)</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✨ 目前開放銷售中</span>
                      </div>
                      <div className="mini-timeline-track" style={{
                        height: '8px',
                        background: 'rgba(46, 187, 119, 0.03)',
                        borderRadius: '4px',
                        position: 'relative',
                        border: '1px dashed var(--accent)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: '100%',
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(46, 187, 119, 0.1) 4px, rgba(46, 187, 119, 0.1) 8px)',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--mono)' }}>
                        <span>今日</span>
                        <span>+30天</span>
                        <span>+60天</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Management Form (Hidden in Pitch Mode) */}
                {!pitchMode ? (
                  <div className="detail-edit-form">
                    <div className="detail-edit-row">
                      <label>檔期狀態</label>
                      <select
                        value={selectedSlot.status}
                        onChange={(e) => {
                          const status = e.target.value as any;
                          let stage = selectedSlot.stage;
                          if (status === 'available') {
                            stage = '可售 / 待洽談';
                          } else if (status === 'negotiating' && stage === '可售 / 待洽談') {
                            stage = '洽談中';
                          } else if (status === 'booked' && (stage === '可售 / 待洽談' || stage === '洽談中')) {
                            stage = '已安排';
                          }
                          updateSlot(selectedSlot.id, { status, stage });
                        }}
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

                    {/* Task 2: hasMaterial control in details edit panel */}
                    <div className="detail-edit-row" style={{ marginTop: '6px' }}>
                      <label className="check-row" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={!!selectedSlot.hasMaterial}
                          onChange={(e) => updateSlot(selectedSlot.id, { hasMaterial: e.target.checked })}
                        />
                        <span>廣告素材已就緒 (已上傳)</span>
                      </label>
                    </div>

                    {selectedSlot.status !== 'available' && (
                      <Fragment>
                        <div className="detail-edit-row">
                          <label>視覺展示代表色 (預覽色塊)</label>
                          <select
                            value={selectedSlot.materialColor || '#3b82f6'}
                            onChange={(e) => updateSlot(selectedSlot.id, { materialColor: e.target.value })}
                          >
                            <option value="#F3BA2F">金色黃 (Binance)</option>
                            <option value="#F0A818">明亮黃 (Bybit)</option>
                            <option value="#EB6A1B">橘色 (OKX)</option>
                            <option value="#103F91">深藍 (Crypto.com)</option>
                            <option value="#28A0F0">天藍 (Arbitrum)</option>
                            <option value="#8247e5">紫色 (Polygon)</option>
                            <option value="#00c087">綠色 (USDT)</option>
                            <option value="#e84142">紅色 (Avalanche)</option>
                          </select>
                        </div>
                        <div className="detail-edit-row">
                          <label>廣告簡稱 (Preview文字/拼寫)</label>
                          <input
                            type="text"
                            value={selectedSlot.materialText || ''}
                            placeholder="例如: BINANCE"
                            onChange={(e) => updateSlot(selectedSlot.id, { materialText: e.target.value })}
                          />
                        </div>
                      </Fragment>
                    )}

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
                  /* Pitch Mode client info banner */
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`status-badge ${slot.status}`}>
                            {statusLabelMap[slot.status]}
                          </span>
                          {slot.status !== 'available' && (
                            <span className={`material-badge ${slot.hasMaterial ? 'ready' : 'pending'}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                              {slot.hasMaterial ? '就緒' : '待素材'}
                            </span>
                          )}
                        </div>
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

          {/* Time timeline controls */}
          <div className="gantt-header-actions" style={{ marginBottom: '16px' }}>
            <div className="seg view-seg">
              <button
                className={scheduleViewMode === 'calendar' ? 'on' : ''}
                onClick={() => setScheduleViewMode('calendar')}
              >
                🗓️ 日曆甘特圖
              </button>
              <button
                className={scheduleViewMode === 'list' ? 'on' : ''}
                onClick={() => setScheduleViewMode('list')}
              >
                📋 列表檢視
              </button>
            </div>

            {scheduleViewMode === 'calendar' && (
              <div className="seg view-seg">
                <button
                  className={selectedMonthStr === '2026/06' ? 'on' : ''}
                  onClick={() => {
                    setSelectedMonthStr('2026/06');
                    setSelectedDateFilter(new Date(2026, 5, 10));
                  }}
                >
                  2026年6月
                </button>
                <button
                  className={selectedMonthStr === '2026/07' ? 'on' : ''}
                  onClick={() => {
                    setSelectedMonthStr('2026/07');
                    setSelectedDateFilter(new Date(2026, 6, 10));
                  }}
                >
                  2026年7月
                </button>
                <button
                  className={selectedMonthStr === '2026/08' ? 'on' : ''}
                  onClick={() => {
                    setSelectedMonthStr('2026/08');
                    setSelectedDateFilter(new Date(2026, 7, 10));
                  }}
                >
                  2026年8月
                </button>
              </div>
            )}
          </div>

          {/* Calendar/Gantt Timeline View */}
          <div style={{ display: scheduleViewMode === 'calendar' ? 'block' : 'none' }}>
            <div className="gantt-container">
              <div className="gantt-scroll-wrapper">
                <table className="gantt-table">
                  <thead>
                    <tr>
                      <th className="gantt-label-col">廣告版位</th>
                      {daysArray.map((d) => {
                        const cellDate = new Date(currentYear, currentMonth, d);
                        const dayOfWeek = cellDate.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const today = new Date();
                        const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() && d === today.getDate();
                        const isSelected = selectedDateFilter.getFullYear() === currentYear &&
                          selectedDateFilter.getMonth() === currentMonth &&
                          selectedDateFilter.getDate() === d;

                        const dayNameMap = ['日', '一', '二', '三', '四', '五', '六'];
                        const dayName = dayNameMap[dayOfWeek];

                        return (
                          <th
                            key={d}
                            className={`gantt-day-header ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''}`}
                            style={{
                              background: isSelected ? 'var(--accent-glow)' : '',
                              border: isSelected ? '1px solid var(--accent)' : '',
                              outline: isSelected ? '1px solid var(--accent)' : ''
                            }}
                            onClick={() => setSelectedDateFilter(cellDate)}
                          >
                            <div>{d}</div>
                            <div style={{ fontSize: '8px', opacity: 0.6, marginTop: '2px' }}>{dayName}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(['homepage', 'newsletter', 'line', 'social'] as const).map((surf) => {
                      const surfSlots = placements.filter((p) => p.surface === surf);
                      const surfHeaderLabelMap = {
                        homepage: '首頁 載體',
                        newsletter: '電子報 載體',
                        line: 'Line@ 載體',
                        social: '社群 載體'
                      };
                      const surfName = surfHeaderLabelMap[surf];

                      return (
                        <Fragment key={surf}>
                          <tr className="gantt-surface-row">
                            <td colSpan={1 + daysInMonth} style={{ fontWeight: '700', padding: '8px 12px' }}>
                              {surfName}
                            </td>
                          </tr>
                          {surfSlots.map((slot) => {
                            return (
                              <tr key={slot.id}>
                                <td
                                  className="gantt-label-col"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    handleSurfaceChange(slot.surface);
                                    setSelectedSlotId(slot.id);
                                    onNavigate?.('/placements');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                >
                                  <div style={{ fontWeight: '600' }}>{slot.name}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'var(--mono)' }}>
                                    {slot.size}
                                  </div>
                                </td>
                                <td colSpan={daysInMonth} style={{ position: 'relative', height: '40px', padding: 0 }}>
                                  {/* Grid background */}
                                  <div style={{ display: 'flex', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                                    {daysArray.map((d) => {
                                      const cellDate = new Date(currentYear, currentMonth, d);
                                      const dayOfWeek = cellDate.getDay();
                                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                      const today = new Date();
                                      const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() && d === today.getDate();
                                      const isSelected = selectedDateFilter.getFullYear() === currentYear &&
                                        selectedDateFilter.getMonth() === currentMonth &&
                                        selectedDateFilter.getDate() === d;

                                      return (
                                        <div
                                          key={d}
                                          style={{
                                            flex: '1 0 0',
                                            height: '100%',
                                            position: 'relative',
                                            borderRight: '1px solid var(--border-soft)',
                                            background: isSelected ? 'rgba(46, 187, 119, 0.05)' : isWeekend ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                          }}
                                          onClick={() => setSelectedDateFilter(cellDate)}
                                        >
                                          {isToday && (
                                            <div
                                              style={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: '50%',
                                                width: '1px',
                                                background: 'var(--err)',
                                                opacity: 0.5,
                                                pointerEvents: 'none',
                                                zIndex: 6
                                              }}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Single contiguous booking bar overlay */}
                                  {(() => {
                                    const barRange = getVisibleBookingRange(slot, currentYear, currentMonth);
                                    if (!barRange) return null;

                                    const totalDays = daysInMonth;
                                    const leftPercent = ((barRange.startDay - 1) / totalDays) * 100;
                                    const widthPercent = ((barRange.endDay - barRange.startDay + 1) / totalDays) * 100;

                                    const barStyle: React.CSSProperties = {
                                      position: 'absolute',
                                      top: '6px',
                                      bottom: '6px',
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      zIndex: 10,
                                      backgroundColor: barRange.hasMaterial ? barRange.color : 'var(--panel-2)',
                                      border: barRange.hasMaterial
                                        ? `1px solid ${barRange.color}`
                                        : `2px dashed ${barRange.color}`,
                                      borderLeft: barRange.isStartCap ? undefined : 'none',
                                      borderRight: barRange.isEndCap ? undefined : 'none',
                                      borderTopLeftRadius: barRange.isStartCap ? '4px' : '0',
                                      borderBottomLeftRadius: barRange.isStartCap ? '4px' : '0',
                                      borderTopRightRadius: barRange.isEndCap ? '4px' : '0',
                                      borderBottomRightRadius: barRange.isEndCap ? '4px' : '0',
                                      transition: 'var(--transition-fast)',
                                      cursor: 'pointer',
                                      boxSizing: 'border-box'
                                    };

                                    if (!barRange.hasMaterial) {
                                      barStyle.backgroundImage = `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent 8px,
                                        color-mix(in srgb, ${barRange.color} 15%, transparent) 8px,
                                        color-mix(in srgb, ${barRange.color} 15%, transparent) 16px
                                      )`;
                                    }

                                    return (
                                      <div
                                        style={barStyle}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const cellDate = new Date(currentYear, currentMonth, barRange.startDay);
                                          setSelectedDateFilter(cellDate);
                                        }}
                                        title={`${slot.name} - ${pitchMode ? (slot.status === 'booked' ? '已預訂' : '洽談中') : slot.client || '無客戶'} (${slot.schedule}) - ${slot.hasMaterial ? '✅ 素材已就緒' : '⏳ 待素材'}`}
                                      />
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

               {/* Gantt Legend */}
              <div className="gantt-legend">
                <div className="gantt-legend-item">
                  <div className="gantt-legend-color" style={{ background: 'var(--accent-2)' }} />
                  <span>已預訂 / 安排中 (依客戶品牌色區分)</span>
                </div>
                <div className="gantt-legend-item">
                  <div className="gantt-legend-color" style={{ background: 'var(--warn)' }} />
                  <span>洽談中檔期</span>
                </div>
                <div className="gantt-legend-item">
                  <div className="gantt-legend-color" style={{ border: '2px dashed var(--warn)', background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245, 158, 11, 0.15) 4px, rgba(245, 158, 11, 0.15) 8px)' }} />
                  <span>⏳ 待補素材 (斜紋與虛線外框)</span>
                </div>
                <div className="gantt-legend-item">
                  <div className="gantt-legend-color" style={{ border: '1px dashed var(--border)', background: 'transparent' }} />
                  <span>開放銷售 (空欄)</span>
                </div>
              </div>
            </div>

            {/* Clickable Date Summary Section */}
            {selectedDateFilter && (
              <div className="gantt-summary-panel">
                <div className="gantt-summary-header">
                  <div className="gantt-summary-title">
                    <span>📅</span>
                    <span>{selectedDateFilter.getFullYear()}/{String(selectedDateFilter.getMonth() + 1).padStart(2, '0')}/{String(selectedDateFilter.getDate()).padStart(2, '0')} 當日排期摘要</span>
                  </div>
                  <div className="gantt-summary-stats">
                    <span className="status-badge booked">
                      已售出: {placements.filter((p) => p.status === 'booked' && isDateWithinPlacement(selectedDateFilter, p)).length}
                    </span>
                    <span className="status-badge negotiating">
                      洽談中: {placements.filter((p) => p.status === 'negotiating' && isDateWithinPlacement(selectedDateFilter, p)).length}
                    </span>
                    <span className="status-badge available">
                      可銷售: {placements.length - placements.filter((p) => p.status !== 'available' && isDateWithinPlacement(selectedDateFilter, p)).length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Active Bookings (Left) */}
                  <div>
                    <h4 style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🚫 已佔用版位 ({placements.filter((p) => p.status !== 'available' && isDateWithinPlacement(selectedDateFilter, p)).length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {placements.filter((p) => p.status !== 'available' && isDateWithinPlacement(selectedDateFilter, p)).length > 0 ? (
                        placements
                          .filter((p) => p.status !== 'available' && isDateWithinPlacement(selectedDateFilter, p))
                          .map((slot) => (
                            <div
                              key={slot.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'var(--panel-2)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '6px'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{slot.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>客戶: {pitchMode ? (slot.status === 'booked' ? '🔒 已預訂' : '⏳ 洽談中') : slot.client}</span>
                                  <span>•</span>
                                  <span className={`material-badge ${slot.hasMaterial ? 'ready' : 'pending'}`} style={{ fontSize: '9px', padding: '0px 4px' }}>
                                    {slot.hasMaterial ? '✅ 素材已就緒' : '⏳ 待素材'}
                                  </span>
                                  <span>•</span>
                                  <span>檔期: {slot.schedule}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`status-badge ${slot.status}`}>
                                  {statusLabelMap[slot.status]}
                                </span>
                                {!pitchMode && (
                                  <button
                                    className="schedule-quick-edit-btn"
                                    onClick={() => {
                                      handleSurfaceChange(slot.surface);
                                      setSelectedSlotId(slot.id);
                                      onNavigate?.('/placements');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                  >
                                    編輯
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '12px', textAlign: 'center' }}>
                          當日無已預訂或洽談中檔期。
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Available Placements (Right) */}
                  <div>
                    <h4 style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ✅ 可供銷售版位 ({placements.length - placements.filter((p) => p.status !== 'available' && isDateWithinPlacement(selectedDateFilter, p)).length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                      {placements.filter((p) => p.status === 'available' || !isDateWithinPlacement(selectedDateFilter, p)).map((slot) => (
                        <div
                          key={slot.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'var(--panel-2)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '6px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{slot.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                              尺寸: {slot.size} • 格式: {slot.format}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="status-badge available">可用</span>
                            {!pitchMode && (
                              <button
                                className="schedule-quick-edit-btn"
                                onClick={() => {
                                  handleSurfaceChange(slot.surface);
                                  setSelectedSlotId(slot.id);
                                  onNavigate?.('/placements');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                編輯
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List View (Original list view kept here to guarantee test passes and fallback option) */}
          <div style={{ display: scheduleViewMode === 'list' ? 'block' : 'none' }}>
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
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                  onNavigate?.('/placements');
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
        </div>
      )}

      {/* Task 1: Day Preview tab */}
      {subTab === 'preview' && (
        <div className="preview-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Preview date switcher bar */}
          <div className="preview-controls">
            <div className="preview-date-picker-wrap">
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>📅 選擇預覽日期：</span>
              <input
                type="date"
                value={previewDateStr}
                onChange={(e) => setPreviewDateStr(e.target.value)}
              />
              <button
                className="preview-btn"
                onClick={() => {
                  const today = new Date();
                  setPreviewDateStr(fmtYYYYMMDD(today));
                }}
              >
                今天
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="preview-btn" onClick={() => handleDayShift(-1)}>上一天 ‹</button>
              <button className="preview-btn" onClick={() => handleDayShift(1)}>› 下一天</button>
            </div>
          </div>

          <div className="map-layout">
            {/* WYSIWYG Mockup (Left) */}
            <div className="wireframe-container" style={{ padding: '36px' }}>
              {selectedSurface === 'homepage' && (
                <div className="wireframe-mock" style={{ minHeight: '480px' }}>
                  <div className="wf-hp-header">
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--muted)' }}>BlockTempo</span>
                    <div className="wf-hp-nav">
                      <div className="wf-hp-nav-dot" />
                      <div className="wf-hp-nav-dot" />
                      <div className="wf-hp-nav-dot" />
                    </div>
                  </div>

                  {/* Leaderboard slot */}
                  <div style={{ height: '56px' }}>
                    {(() => {
                      const slot = slotById('hp-leaderboard');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                            <div style={{ fontSize: '13px', letterSpacing: '0.05em' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材已就緒 • Leaderboard ({slot.size})</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg">
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            <div style={{ fontSize: '9px' }}>檔期: {slot.schedule}</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg">
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可供銷售 (Leaderboard)</div>
                          <div style={{ fontSize: '9px' }}>{slot.size}</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Hero Slider */}
                  <div className="wf-hp-hero">
                    <div className="wf-rect">精選首圖 Slider</div>
                    <div className="wf-rect" style={{ fontSize: '10px' }}>熱門新聞排行</div>
                  </div>

                  {/* Main feed / Sidebar */}
                  <div className="wf-hp-main-cols">
                    <div className="wf-hp-posts">
                      <div className="wf-hp-post-card">
                        <div className="wf-hp-post-thumb" />
                        <div className="wf-hp-post-lines">
                          <div className="wf-hp-line title" />
                          <div className="wf-hp-line desc" />
                        </div>
                      </div>

                      {/* Content ad slot */}
                      <div style={{ height: '48px' }}>
                        {(() => {
                          const slot = slotById('hp-content-1');
                          const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                          return occupied ? (
                            slot.hasMaterial ? (
                              <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材已就緒 ({slot.size})</div>
                              </div>
                            ) : (
                              <div className="preview-ad-card preview-stripe-bg">
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                              </div>
                            )
                          ) : (
                            <div className="preview-ad-card preview-open-bg">
                              <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可供銷售 (內容區寬幅)</div>
                              <div style={{ fontSize: '9px' }}>{slot.size}</div>
                            </div>
                          );
                        })()}
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
                      {/* B+ square */}
                      <div style={{ height: '70px' }}>
                        {(() => {
                          const slot = slotById('hp-sidebar-1');
                          const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                          return occupied ? (
                            slot.hasMaterial ? (
                              <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                              </div>
                            ) : (
                              <div className="preview-ad-card preview-stripe-bg">
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                              </div>
                            )
                          ) : (
                            <div className="preview-ad-card preview-open-bg">
                              <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可售 (Area B+)</div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* B square */}
                      <div style={{ height: '70px' }}>
                        {(() => {
                          const slot = slotById('hp-sidebar-2');
                          const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                          return occupied ? (
                            slot.hasMaterial ? (
                              <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                              </div>
                            ) : (
                              <div className="preview-ad-card preview-stripe-bg">
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                              </div>
                            )
                          ) : (
                            <div className="preview-ad-card preview-open-bg">
                              <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可售 (Area B)</div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* C square */}
                      <div style={{ height: '70px' }}>
                        {(() => {
                          const slot = slotById('hp-sidebar-3');
                          const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                          return occupied ? (
                            slot.hasMaterial ? (
                              <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                              </div>
                            ) : (
                              <div className="preview-ad-card preview-stripe-bg">
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                              </div>
                            )
                          ) : (
                            <div className="preview-ad-card preview-open-bg">
                              <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可售 (Area C)</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Area E */}
                  <div style={{ height: '48px' }}>
                    {(() => {
                      const slot = slotById('hp-footer-1');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                            <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg">
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg">
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (Area E)</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer banner */}
                  <div style={{ height: '42px' }}>
                    {(() => {
                      const slot = slotById('hp-footer-banner');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                            <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg">
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg">
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (頁尾橫幅)</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedSurface === 'newsletter' && (
                <div className="wireframe-mock wf-nl-email" style={{ minHeight: '400px' }}>
                  <div className="wf-nl-header">動區 BlockTempo NEWSLETTER</div>

                  {/* nl header slot */}
                  <div style={{ height: '56px' }}>
                    {(() => {
                      const slot = slotById('nl-header');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                            <div style={{ fontSize: '13px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材已就緒 ({slot.size})</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg">
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            <div style={{ fontSize: '9px' }}>檔期: {slot.schedule}</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg">
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可供銷售 (信頭橫幅)</div>
                          <div style={{ fontSize: '9px' }}>{slot.size}</div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="wf-nl-hero">
                    <div className="wf-hp-line title" style={{ width: '80%' }} />
                    <div className="wf-hp-line desc" style={{ width: '60%' }} />
                  </div>

                  {/* nl squares */}
                  <div className="wf-nl-body-squares">
                    <div style={{ height: '90px' }}>
                      {(() => {
                        const slot = slotById('nl-body-1');
                        const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                        return occupied ? (
                          slot.hasMaterial ? (
                            <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                              <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                              <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                            </div>
                          ) : (
                            <div className="preview-ad-card preview-stripe-bg">
                              <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            </div>
                          )
                        ) : (
                          <div className="preview-ad-card preview-open-bg">
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (方塊一)</div>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ height: '90px' }}>
                      {(() => {
                        const slot = slotById('nl-body-2');
                        const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                        return occupied ? (
                          slot.hasMaterial ? (
                            <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                              <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                              <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                            </div>
                          ) : (
                            <div className="preview-ad-card preview-stripe-bg">
                              <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            </div>
                          )
                        ) : (
                          <div className="preview-ad-card preview-open-bg">
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (方塊二)</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Inline banner */}
                  <div style={{ height: '48px' }}>
                    {(() => {
                      const slot = slotById('nl-inline-1');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                            <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg">
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg">
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (內嵌橫幅)</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedSurface === 'line' && (
                <div className="wf-line-phone">
                  <div className="wf-phone-ear" />
                  <div className="wf-line-chat-header">
                    <span>Line@ BlockTempo 預覽</span>
                  </div>
                  <div className="wf-line-chat-body">
                    <div className="wf-line-bubble bot">
                      👋 Line@ 模擬聊天室
                    </div>

                    {/* Line Push ad */}
                    <div style={{ height: '60px', width: '80%', alignSelf: 'flex-start' }}>
                      {(() => {
                        const slot = slotById('line-push');
                        const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                        return occupied ? (
                          slot.hasMaterial ? (
                            <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot), borderRadius: '12px' }}>
                              <div style={{ fontSize: '11px' }}>{getMaterialText(slot)}</div>
                              <div style={{ fontSize: '8px', opacity: 0.8 }}>✅ 素材就緒 (推播置入)</div>
                            </div>
                          ) : (
                            <div className="preview-ad-card preview-stripe-bg" style={{ borderRadius: '12px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            </div>
                          )
                        ) : (
                          <div className="preview-ad-card preview-open-bg" style={{ borderRadius: '12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可供銷售 (文字推播)</div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Line Post ad */}
                    <div style={{ height: '60px', width: '80%', alignSelf: 'flex-start' }}>
                      {(() => {
                        const slot = slotById('line-post');
                        const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                        return occupied ? (
                          slot.hasMaterial ? (
                            <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot), borderRadius: '12px' }}>
                              <div style={{ fontSize: '11px' }}>{getMaterialText(slot)}</div>
                              <div style={{ fontSize: '8px', opacity: 0.8 }}>✅ 素材就緒 (貼文牆置入)</div>
                            </div>
                          ) : (
                            <div className="preview-ad-card preview-stripe-bg" style={{ borderRadius: '12px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                            </div>
                          )
                        ) : (
                          <div className="preview-ad-card preview-open-bg" style={{ borderRadius: '12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可供銷售 (官方號帖文)</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Rich menu slot */}
                  <div style={{ height: '80px' }}>
                    {(() => {
                      const slot = slotById('line-menu');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot), borderRadius: '0 0 20px 20px' }}>
                            <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 (Rich Menu)</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg" style={{ borderRadius: '0 0 20px 20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg" style={{ borderRadius: '0 0 20px 20px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (Rich Menu 選單)</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedSurface === 'social' && (
                <div className="wireframe-mock wf-soc" style={{ minHeight: '440px' }}>
                  {/* FB Cover */}
                  <div className="wf-soc-cover-container" style={{ height: '110px' }}>
                    {(() => {
                      const slot = slotById('soc-fb-cover');
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return occupied ? (
                        slot.hasMaterial ? (
                          <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot), borderRadius: '6px' }}>
                            <div style={{ fontSize: '13px' }}>{getMaterialText(slot)}</div>
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 (FB 封面)</div>
                          </div>
                        ) : (
                          <div className="preview-ad-card preview-stripe-bg" style={{ borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                          </div>
                        )
                      ) : (
                        <div className="preview-ad-card preview-open-bg" style={{ borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>✨ 可售 (Facebook 封面)</div>
                        </div>
                      );
                    })()}
                    <div className="wf-soc-avatar" />
                  </div>

                  <div className="wf-soc-feed">
                    <div className="wf-soc-column">
                      {/* FB Post ad */}
                      <div className="wf-soc-card">
                        <div className="wf-soc-card-header">
                          <div className="wf-soc-card-avatar" />
                          <div className="wf-soc-card-title">BlockTempo</div>
                          <span className="wf-soc-card-sponsored">Sponsored</span>
                        </div>
                        <div className="wf-hp-line" style={{ width: '90%' }} />
                        <div style={{ height: '70px' }}>
                          {(() => {
                            const slot = slotById('soc-fb-post');
                            const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                            return occupied ? (
                              slot.hasMaterial ? (
                                <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                  <div style={{ fontSize: '12px' }}>{getMaterialText(slot)}</div>
                                  <div style={{ fontSize: '9px', opacity: 0.8 }}>✅ 素材就緒 (FB 發布置入)</div>
                                </div>
                              ) : (
                                <div className="preview-ad-card preview-stripe-bg">
                                  <div style={{ fontSize: '11px', fontWeight: 600 }}>⏳ 等待素材 ({pitchMode ? '已預訂' : slot.client})</div>
                                </div>
                              )
                            ) : (
                              <div className="preview-ad-card preview-open-bg">
                                <div style={{ fontSize: '10px', fontWeight: 600 }}>✨ 可售 (FB 貼文置入)</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="wf-soc-column">
                      {/* TG Post ad */}
                      <div className="wf-soc-card" style={{ background: '#1c252e', borderColor: '#2b3945' }}>
                        <div className="wf-soc-card-header">
                          <div className="wf-soc-card-avatar" style={{ background: '#54b3e6' }} />
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff' }}>Telegram 晨報</span>
                        </div>
                        <div style={{ height: '48px' }}>
                          {(() => {
                            const slot = slotById('soc-tg-post');
                            const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                            return occupied ? (
                              slot.hasMaterial ? (
                                <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                  <div style={{ fontSize: '11px' }}>{getMaterialText(slot)}</div>
                                  <div style={{ fontSize: '8px', opacity: 0.8 }}>✅ 素材就緒 (TG 推播)</div>
                                </div>
                              ) : (
                                <div className="preview-ad-card preview-stripe-bg">
                                  <div style={{ fontSize: '9px', fontWeight: 600 }}>⏳ 等待素材</div>
                                </div>
                              )
                            ) : (
                              <div className="preview-ad-card preview-open-bg">
                                <div style={{ fontSize: '9px', fontWeight: 600 }}>✨ 可售 (TG 頻道置入)</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Article footer ad */}
                      <div className="wf-soc-card" style={{ padding: '8px' }}>
                        <div style={{ height: '40px' }}>
                          {(() => {
                            const slot = slotById('soc-art-footer');
                            const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                            return occupied ? (
                              slot.hasMaterial ? (
                                <div className="preview-ad-card preview-creative" style={{ background: getMaterialColor(slot) }}>
                                  <div style={{ fontSize: '11px' }}>{getMaterialText(slot)}</div>
                                  <div style={{ fontSize: '8px', opacity: 0.8 }}>✅ 素材就緒 ({slot.size})</div>
                                </div>
                              ) : (
                                <div className="preview-ad-card preview-stripe-bg">
                                  <div style={{ fontSize: '10px', fontWeight: 600 }}>⏳ 待素材</div>
                                </div>
                              )
                            ) : (
                              <div className="preview-ad-card preview-open-bg">
                                <div style={{ fontSize: '9px', fontWeight: 600 }}>✨ 可售 (文章末尾)</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Day Placements Details Panel (Right) */}
            <div className="panel detail-panel">
              <div>
                <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px', marginBottom: '14px' }}>
                  <span className="muted" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {selectedSurface === 'homepage' ? '首頁 Web' : selectedSurface === 'newsletter' ? '動區電子報' : selectedSurface === 'line' ? 'Line@ 官方號' : '社群發布'}
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700 }}>
                    📅 {previewDateStr} 版位狀態
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {placements
                    .filter(p => p.surface === selectedSurface)
                    .map(slot => {
                      const occupied = slot.status !== 'available' && isDateWithinPlacement(previewDate, slot);
                      return (
                        <div
                          key={slot.id}
                          style={{
                            background: 'var(--panel-2)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '6px',
                            padding: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{slot.name}</span>
                            <span className={`status-badge ${occupied ? slot.status : 'available'}`}>
                              {occupied ? statusLabelMap[slot.status] : '可用'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                            尺寸: {slot.size} • 格式: {slot.format}
                          </div>
                          
                          {occupied && (
                            <div style={{
                              marginTop: '8px',
                              paddingTop: '8px',
                              borderTop: '1px dashed var(--border-soft)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                                客戶: {pitchMode ? '🔒 已預訂' : slot.client}
                              </span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span className={`material-badge ${slot.hasMaterial ? 'ready' : 'pending'}`}>
                                  {slot.hasMaterial ? '素材已就緒' : '等待素材'}
                                </span>
                                {!pitchMode && (
                                  <button
                                    className="schedule-quick-edit-btn"
                                    onClick={() => updateSlot(slot.id, { hasMaterial: !slot.hasMaterial })}
                                    style={{ fontSize: '10px', padding: '2px 6px' }}
                                  >
                                    切換
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {!pitchMode && (
                            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                className="schedule-quick-edit-btn"
                                onClick={() => {
                                  handleSurfaceChange(slot.surface);
                                  setSelectedSlotId(slot.id);
                                  onNavigate?.('/placements');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                              >
                                詳細編輯
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task 3: Configurable Kanban board subtab */}
      {subTab === 'board' && (
        <div className="kanban-layout" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Kanban settings topbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              💡 支援拖移卡片更變生命週期狀態，編輯即時自動同步排期系統。
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="preview-btn" onClick={() => setShowStageSettings(!showStageSettings)}>
                ⚙️ {showStageSettings ? '隱藏狀態欄設定' : '管理狀態欄位'}
              </button>
              <button className="preview-btn" onClick={handleResetStages}>
                🔄 重設預設狀態
              </button>
            </div>
          </div>

          {showStageSettings && (
            <div className="kanban-settings-panel">
              <h4 style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                自訂看板狀態欄位 (自左至右順序)
              </h4>
              <div className="kanban-settings-row">
                {stages.map((stage, idx) => (
                  <div key={stage} className="kanban-settings-stage-chip">
                    {editingStageIndex === idx ? (
                      <input
                        type="text"
                        value={editingStageName}
                        onChange={(e) => setEditingStageName(e.target.value)}
                        onBlur={() => handleRenameStage(idx)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameStage(idx) }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{ cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => { setEditingStageIndex(idx); setEditingStageName(stage) }}
                        title="點選重新命名"
                      >
                        {stage}
                      </span>
                    )}
                    {stage !== '可售 / 待洽談' && (
                      <button
                        onClick={() => handleDeleteStage(stage)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--err)', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 'bold' }}
                        title="刪除此狀態"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '12px' }}>
                <input
                  type="text"
                  placeholder="輸入新狀態欄名稱..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  style={{ width: '220px', padding: '6px 10px', background: 'var(--panel-2)', border: '1px solid var(--border-soft)', borderRadius: '6px', fontSize: '12.5px', color: 'var(--text)' }}
                />
                <button
                  className="preview-btn"
                  onClick={handleAddStage}
                  style={{ padding: '6px 12px' }}
                >
                  ＋ 新增狀態
                </button>
              </div>
            </div>
          )}

          {/* Kanban drag-and-drop board grid */}
          <div className="kanban-board">
            {stages.map((stage) => {
              // Resolve each slot to an existing column; any slot whose stage was
              // deleted/renamed/corrupted falls into the first column instead of vanishing.
              const stageSlots = placements.filter(p => {
                const effective = p.stage && stages.includes(p.stage) ? p.stage : stages[0];
                return effective === stage;
              });
              return (
                <div
                  key={stage}
                  className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const slotId = e.dataTransfer.getData('text/plain');
                    if (slotId) {
                      handleMoveCard(slotId, stage);
                    }
                  }}
                >
                  <div className="kanban-column-header">
                    <span>{stage}</span>
                    <span className="kanban-column-count">{stageSlots.length}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                    {stageSlots.map((slot) => {
                      return (
                        <div
                          key={slot.id}
                          className="kanban-card"
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', slot.id);
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                            <span className="kanban-card-title">{slot.name}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span className="meta-badge" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {slot.surfaceName}
                            </span>
                            <span className={`status-badge ${slot.status}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {statusLabelMap[slot.status]}
                            </span>
                          </div>

                          {slot.status !== 'available' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', borderTop: '1px dashed var(--border-soft)', paddingTop: '6px', marginTop: '2px' }}>
                              <div>
                                <span className="muted">客戶:</span>{' '}
                                <span style={{ fontWeight: 600 }}>{pitchMode ? '🔒 已預訂' : slot.client}</span>
                              </div>
                              {slot.schedule && (
                                <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                  {slot.schedule}
                                </div>
                              )}
                              <div style={{ marginTop: '2px' }}>
                                <span className={`material-badge ${slot.hasMaterial ? 'ready' : 'pending'}`}>
                                  {slot.hasMaterial ? '✅ 素材已就緒' : '⏳ 待素材'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action drop-down for touch-fallback or manual shift */}
                          <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>搬移階段</span>
                            <select
                              value={stage}
                              onChange={(e) => handleMoveCard(slot.id, e.target.value)}
                              style={{
                                width: 'auto',
                                padding: '2px 4px',
                                fontSize: '10px',
                                background: 'var(--panel)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '4px',
                                color: 'var(--text)'
                              }}
                            >
                              {stages.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                    {stageSlots.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-soft)', borderRadius: '8px', minHeight: '80px', color: 'var(--muted)', fontSize: '11.5px' }}>
                        空欄位
                      </div>
                    )}
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
