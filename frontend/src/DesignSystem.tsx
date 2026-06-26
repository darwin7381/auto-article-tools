import { useState } from 'react'

const DARK_COLORS = [
  { name: '--bg', label: '全域背景 (Background)', hex: '#0a0a0c' },
  { name: '--panel', label: '主面板背景 (Panel)', hex: '#141416' },
  { name: '--panel-2', label: '次級/分段背景 (Panel 2)', hex: '#1f1f22' },
  { name: '--side', label: '側邊欄背景 (Sidebar BG)', hex: '#0e0e10' },
  { name: '--text', label: '主要文字 (Text)', hex: '#f3f4f6' },
  { name: '--muted', label: '次要/靜音文字 (Muted)', hex: '#9ca3af' },
  { name: '--border', label: '主要邊框 (Border)', hex: 'rgba(255, 255, 255, 0.08)' },
  { name: '--border-soft', label: '細/軟邊框 (Soft Border)', hex: 'rgba(255, 255, 255, 0.04)' },
  { name: '--accent', label: '主品牌特徵色 (Accent Green)', hex: '#2ebb77' },
  { name: '--accent-2', label: '次要輔助色 (Accent Blue)', hex: '#58a6ff' },
  { name: '--ok', label: '成功/健康 (Success)', hex: '#2ebb77' },
  { name: '--warn', label: '警告/提醒 (Warning)', hex: '#f59e0b' },
  { name: '--err', label: '錯誤/危險 (Error)', hex: '#ef4444' },
]

const LIGHT_COLORS = [
  { name: '--bg', label: '全域背景 (Background)', hex: '#f9fafb' },
  { name: '--panel', label: '主面板背景 (Panel)', hex: '#ffffff' },
  { name: '--panel-2', label: '次級/分段背景 (Panel 2)', hex: '#f3f4f6' },
  { name: '--side', label: '側邊欄背景 (Sidebar BG)', hex: '#ffffff' },
  { name: '--text', label: '主要文字 (Text)', hex: '#111827' },
  { name: '--muted', label: '次要/靜音文字 (Muted)', hex: '#6b7280' },
  { name: '--border', label: '主要邊框 (Border)', hex: '#e5e7eb' },
  { name: '--border-soft', label: '細/軟邊框 (Soft Border)', hex: '#f3f4f6' },
  { name: '--accent', label: '主品牌特徵色 (Accent Green)', hex: '#168051' },
  { name: '--accent-2', label: '次要輔助色 (Accent Blue)', hex: '#0969da' },
  { name: '--ok', label: '成功/健康 (Success)', hex: '#168051' },
  { name: '--warn', label: '警告/提醒 (Warning)', hex: '#d97706' },
  { name: '--err', label: '錯誤/危險 (Error)', hex: '#dc2626' },
]

const darkThemeVars = {
  '--bg': '#0a0a0c',
  '--panel': '#141416',
  '--panel-2': '#1f1f22',
  '--side': '#0e0e10',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--border-soft': 'rgba(255, 255, 255, 0.04)',
  '--text': '#f3f4f6',
  '--muted': '#9ca3af',
  '--accent': '#2ebb77',
  '--accent-ink': '#ffffff',
  '--accent-2': '#58a6ff',
  '--warn': '#f59e0b',
  '--err': '#ef4444',
  '--ok': '#2ebb77',
  '--accent-glow': '0 0 12px rgba(46, 187, 119, 0.25)',
  '--accent-2-glow': '0 0 12px rgba(88, 166, 255, 0.20)',
}

const lightThemeVars = {
  '--bg': '#f9fafb',
  '--panel': '#ffffff',
  '--panel-2': '#f3f4f6',
  '--side': '#ffffff',
  '--border': '#e5e7eb',
  '--border-soft': '#f3f4f6',
  '--text': '#111827',
  '--muted': '#6b7280',
  '--accent': '#168051',
  '--accent-ink': '#ffffff',
  '--accent-2': '#0969da',
  '--warn': '#d97706',
  '--err': '#dc2626',
  '--ok': '#168051',
  '--accent-glow': '0 0 12px rgba(22, 128, 81, 0.15)',
  '--accent-2-glow': '0 0 12px rgba(9, 105, 218, 0.12)',
}

export function DesignSystemPanel() {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'components'>('colors')
  const [dummyText, setDummyText] = useState('測試輸入內容')

  return (
    <div className="status-page" style={{ paddingBottom: '40px' }}>
      {/* 頂部導覽切換 */}
      <div className="view-seg" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <button className={activeTab === 'colors' ? 'on' : ''} onClick={() => setActiveTab('colors')}>
          🎨 色彩系統 (Colors)
        </button>
        <button className={activeTab === 'typography' ? 'on' : ''} onClick={() => setActiveTab('typography')}>
          ✍️ 字型與排版 (Typography)
        </button>
        <button className={activeTab === 'spacing' ? 'on' : ''} onClick={() => setActiveTab('spacing')}>
          📏 間距與陰影 (Spacing / Shadow)
        </button>
        <button className={activeTab === 'components' ? 'on' : ''} onClick={() => setActiveTab('components')}>
          🧩 元件展示 (Components)
        </button>
      </div>

      {/* 1. 色彩系統 */}
      {activeTab === 'colors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* 暗色主題色彩 */}
          <div className="panel" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h2 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌙 暗色主題色彩 (Dark Theme Colors)</span>
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {DARK_COLORS.map(c => (
                <div key={c.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: c.hex.startsWith('rgba') ? 'transparent' : c.hex,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundImage: c.hex.startsWith('rgba') ? `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)` : undefined,
                    backgroundSize: c.hex.startsWith('rgba') ? '8px 8px' : undefined,
                    backgroundPosition: c.hex.startsWith('rgba') ? '0 0, 0 4px, 4px -4px, -4px 0' : undefined
                  }}>
                    {c.hex.startsWith('rgba') && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        backgroundColor: c.hex
                      }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{c.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.label}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{c.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 亮色主題色彩 */}
          <div className="panel" style={{ borderLeft: '4px solid var(--accent-2)' }}>
            <h2 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>☀️ 亮色主題色彩 (Light Theme Colors)</span>
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '16px'
            }}>
              {LIGHT_COLORS.map(c => (
                <div key={c.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: c.hex,
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{c.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.label}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{c.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. 字型與排版 */}
      {activeTab === 'typography' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel">
            <h2>字型設定 (Font Family)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>主要無襯線字型 (var(--font))</div>
                <div style={{ fontSize: '15px', fontFamily: 'var(--font)' }}>
                  Plus Jakarta Sans, Inter, -apple-system, 繁體中文介面測試 (0123456789)
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-soft)', margin: '4px 0' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>等寬程式碼字型 (var(--mono))</div>
                <div style={{ fontSize: '14px', fontFamily: 'var(--mono)' }}>
                  JetBrains Mono, monospace, 0123456789, {"const val = () => { return true }"}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>字級比例 (Typography Scale)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Page Title (20px)</span>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>
                  BD 內容自動化平台
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Section H2 (18px)</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                  📋 Delivery 跨部門業務線看板
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Sub H3 (16px)</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                  模組搭建與測試
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Label H4 (14.5px)</span>
                <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>
                  真實素材: HashKey/WEEX/Bluefin
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Body Text (14px)</span>
                <span style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>
                  這是平台的主要內文與標籤大小，具備良好的行高與閱讀舒適度，能清晰呈現自動化產出的文章內容。
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Medium (13px)</span>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                  輸入框文字、一般表格欄位、描述內容。
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Small (11.5px)</span>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  時間戳記、附屬說明、次要標題內容 (e.g. 30 秒前)。
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={{ width: '120px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Mini (10px)</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  STAT CARD LABEL / TC-TYPE BADGE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 間距與陰影 */}
      {activeTab === 'spacing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel">
            <h2>間距比例 (Spacing Scale)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {[4, 8, 12, 16, 20, 24, 32].map(px => (
                <div key={px} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '60px', fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{px}px</span>
                  <div style={{
                    height: '20px',
                    width: `${px * 8}px`,
                    maxWidth: '100%',
                    backgroundColor: 'var(--accent)',
                    opacity: 0.8,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                    color: 'var(--accent-ink)',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    {px}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>圓角與陰影 (Border Radius & Elevation)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              <div style={{
                padding: '20px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border-soft)',
                background: 'var(--panel-2)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>預設面板陰影 (var(--shadow))</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>圓角設定: var(--r) = 10px</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>box-shadow: var(--shadow)</span>
              </div>

              <div className="stat-card" style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>懸停狀態陰影 (var(--shadow-hover))</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>將滑鼠懸停於此卡片以觀看動態過渡與 shadow-hover</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>border-color + translateY + shadow-hover</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 元件展示 */}
      {activeTab === 'components' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* 按鈕展示 */}
          <div className="panel">
            <h2>按鈕元件 (Buttons)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>主要按鈕 (Primary)</div>
                <div style={{ width: '200px' }}>
                  <button className="primary" style={{ marginTop: 0 }} onClick={() => alert('觸發主要操作')}>
                    主要操作按鈕
                  </button>
                </div>
                <div style={{ width: '200px' }}>
                  <button className="primary" style={{ marginTop: 0 }} disabled>
                    已停用主要按鈕
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>幽靈按鈕 (Ghost)</div>
                <div>
                  <button className="ghost" onClick={() => alert('觸發幽靈操作')}>
                    幽靈按鈕
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>連結按鈕 (Link)</div>
                <div>
                  <button className="link" onClick={() => alert('點擊連結')}>
                    連結按鈕描述
                  </button>
                </div>
                <div>
                  <button className="link err" onClick={() => alert('錯誤連結')}>
                    錯誤/危險操作
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>小型按鈕 (Small)</div>
                <div>
                  <button className="primary sm" style={{ marginTop: 0 }}>
                    小主要按鈕
                  </button>
                </div>
                <div>
                  <button className="ghost sm">
                    小幽靈按鈕
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 徽章與狀態標籤 */}
          <div className="panel">
            <h2>徽章與標籤 (Badges & Tags)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>狀態標籤 (.status)</div>
                <span className="status done">Done 完成</span>
                <span className="status running">Running 執行中</span>
                <span className="status pending">Pending 處理中</span>
                <span className="status error">Error 失敗</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>晶片標籤 (.chip)</div>
                <span className="chip">標題正規化</span>
                <span className="chip">引言優化</span>
                <span className="chip">首字放大 (Dropcap)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '120px', fontSize: '12px', color: 'var(--muted)' }}>在線狀態 (.pill)</div>
                <span className="pill ok">
                  <span className="dot" />
                  後端運行中
                </span>
                <span className="pill">
                  <span className="dot" style={{ backgroundColor: 'var(--err)', boxShadow: '0 0 6px var(--err)' }} />
                  離線狀態
                </span>
              </div>
            </div>
          </div>

          {/* 輸入控制項 */}
          <div className="panel">
            <h2>表單輸入項 (Inputs)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', maxWidth: '500px' }}>
              <div>
                <label style={{ margin: '0 0 6px' }}>單行文字輸入框 (Input)</label>
                <input
                  type="text"
                  value={dummyText}
                  onChange={(e) => setDummyText(e.target.value)}
                  placeholder="請輸入文字..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--panel-2)', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ margin: '0 0 6px' }}>多行文字輸入區 (Textarea)</label>
                <textarea
                  placeholder="請輸入多行詳細內容描述..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--panel-2)', color: 'var(--text)', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* 指標卡片 */}
          <div>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', fontWeight: 600 }}>
              數據指標卡片 (Stat Cards)
            </h2>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="stat-val">43</div>
                <div className="stat-label">前端單元測試</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">7</div>
                <div className="stat-label">AI 處理階段</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">100%</div>
                <div className="stat-label">WP 自動上稿率</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">0.05s</div>
                <div className="stat-label">SSE 推播延遲</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">99.8%</div>
                <div className="stat-label">系統可用度</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">4.5★</div>
                <div className="stat-label">編輯滿意評分</div>
              </div>
            </div>
          </div>

          {/* 任務卡片展示 */}
          <div style={{ maxWidth: '400px' }}>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', fontWeight: 600 }}>
              看板任務卡片 (Task Card)
            </h2>
            <div className="task-card">
              <div className="tc-top">
                <span className="tc-type article">A · 新聞稿</span>
                <span className="tc-pri p-high">🔥 高優先級</span>
              </div>
              <div className="tc-title">真實素材: HashKey/WEEX 跨鏈套利智能合約安全性審計</div>
              <div className="tc-sub">稿件編號: job#102 · 自動發佈至 WordPress 媒體庫</div>
              <div className="tc-prog">
                <div className="tc-prog-top">
                  <span className="tc-prog-spin" />
                  <span>AI 潤稿階段 (pr_writer) 進行中...</span>
                </div>
                <div className="tc-bar">
                  <div className="tc-fill" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="tc-foot">
                <span className="tc-assignee">負責人: Claude Subagent</span>
                <span className="tc-due">10 分鐘前</span>
              </div>
            </div>
          </div>

          {/* 數據表格 */}
          <div className="panel">
            <h2>交付跨部門業務線表格 (Delivery Table)</h2>
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table className="dlv-table">
                <thead>
                  <tr>
                    <th>任務 ID</th>
                    <th>稿件類型</th>
                    <th>進稿標題與來源</th>
                    <th>狀態</th>
                    <th>執行時間</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>#49</td>
                    <td><span className="chip">新聞稿</span></td>
                    <td style={{ fontWeight: 500 }}>真實素材: 數碼港 PDF 繁/簡 docx 含圖</td>
                    <td><span className="status done">完成 (11/11)</span></td>
                    <td>137.4s</td>
                  </tr>
                  <tr>
                    <td>#47</td>
                    <td><span className="chip">廣編稿</span></td>
                    <td style={{ fontWeight: 500 }}>WEEX 简中 docx 含圖 · 供稿方替換</td>
                    <td><span className="status done">完成 (11/11)</span></td>
                    <td>118.8s</td>
                  </tr>
                  <tr>
                    <td>#46</td>
                    <td><span className="chip">一般文章</span></td>
                    <td style={{ fontWeight: 500 }}>Bluefin 項目多鏈部署與交易流動性評估</td>
                    <td><span className="status error">失敗 (3/7)</span></td>
                    <td>45.2s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 跨主題實時預覽展示區 */}
          <div className="panel" style={{ border: '1px dashed var(--border)' }}>
            <h2>跨主題實時視覺對比 (Side-by-Side Theme Contrast)</h2>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 20px' }}>
              此區域透過直接注入 CSS 變數，展示相同的元件在暗色與亮色主題下的視覺對比：
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* 暗色主題區 */}
              <div style={{
                ...darkThemeVars,
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>🌙 Dark Mode</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>--bg: #0a0a0c</span>
                </div>
                <div className="panel" style={{ padding: '16px' }}>
                  <h3>預設面版 Card</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '8px 0 12px' }}>
                    搭配 Accent Glow 特效按鈕展示：
                  </p>
                  <button className="primary" style={{ marginTop: 0, padding: '8px 12px', fontSize: '12px' }}>
                    Accent Green 按鈕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="status done">Done</span>
                  <span className="status running">Running</span>
                </div>
              </div>

              {/* 亮色主題區 */}
              <div style={{
                ...lightThemeVars,
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              } as React.CSSProperties}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>☀️ Light Mode</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>--bg: #f9fafb</span>
                </div>
                <div className="panel" style={{ padding: '16px' }}>
                  <h3 style={{ color: 'var(--text)' }}>預設面版 Card</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '8px 0 12px' }}>
                    搭配 Accent Glow 特效按鈕展示：
                  </p>
                  <button className="primary" style={{ marginTop: 0, padding: '8px 12px', fontSize: '12px' }}>
                    Accent Green 按鈕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="status done">Done</span>
                  <span className="status running">Running</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
