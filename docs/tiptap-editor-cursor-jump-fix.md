# TipTap 編輯器游標跳轉問題修復記錄

## 問題描述

### 症狀
- 用戶在編輯器中輸入任何字符時，游標會立即跳轉到編輯器內容的最前面
- 導致編輯幾乎無法正常使用，體驗極差

### 影響範圍
- 所有使用 TipTap 編輯器的頁面
- 包括主要的內容編輯功能
- 嚴重影響用戶編輯體驗

## 根本原因分析

### 錯誤的代碼邏輯
**文件**: `src/components/ui/taptip-editor/index.tsx`

**問題代碼** (第 155-162 行):
```typescript
// ❌ 錯誤的邏輯
useEffect(() => {
  if (currentView === 'visual' && editor) {
    editor.commands.setContent(htmlSource);
    editor.commands.focus('start'); // 強制將游標移到開頭
  }
}, [currentView, editor, htmlSource]); // ← 問題：htmlSource 作為依賴
```

### 錯誤循環過程
1. **用戶輸入字符** → `onUpdate` 回調觸發
2. **更新 htmlSource 狀態** → `setHtmlSource(html)` 
3. **htmlSource 變化觸發 useEffect** → 依賴數組包含 `htmlSource`
4. **重新設置編輯器內容** → `editor.commands.setContent(htmlSource)`
5. **強制將游標移到開頭** → `editor.commands.focus('start')`
6. **結果：每次輸入都導致游標跳到最前面**

### 技術細節
- TipTap 的 `onUpdate` 會在每次內容變化時觸發
- `setContent()` 會完全重置編輯器內容和游標位置
- `focus('start')` 強制將游標移動到內容開始位置
- React useEffect 的依賴數組包含 `htmlSource` 導致無限循環

## 解決方案

### 修復代碼 (優雅版本)

我們提供了兩種解決方案，最終採用更優雅的版本：

```typescript
// ✅ 優雅的解決方案 - 使用 useRef 精確控制
export function TapEditor({ initialContent = '', onChange, placeholder, className }: TapEditorProps) {
  // ... 狀態定義 ...
  
  // 使用 ref 追蹤編輯器是否已初始化和最後的視圖模式
  const isEditorInitialized = useRef(false);
  const lastViewMode = useRef<EditorView>('visual');
  const lastSetContent = useRef<string>('');

  // 當編輯器初始化完成時執行一次性設置
  useEffect(() => {
    if (editor && !isEditorInitialized.current) {
      isEditorInitialized.current = true;
      lastSetContent.current = htmlSource;
      if (currentView === 'visual') {
        editor.commands.setContent(htmlSource);
        editor.commands.focus('start');
      }
    }
  }, [editor, htmlSource, currentView]);

  // 處理視圖切換 - 只在真正需要時設置內容
  useEffect(() => {
    if (editor && isEditorInitialized.current) {
      // 檢查是否是視圖模式變化
      const isViewModeChanged = lastViewMode.current !== currentView;
      // 檢查是否是從 HTML 視圖切換回可視化視圖，且內容有變化
      const isContentChanged = lastSetContent.current !== htmlSource;
      
      if (isViewModeChanged) {
        lastViewMode.current = currentView;
        
        if (currentView === 'visual' && isContentChanged) {
          // 只在從 HTML 視圖切換回可視化視圖且內容有變化時設置內容
          editor.commands.setContent(htmlSource);
          lastSetContent.current = htmlSource;
          // 不自動聚焦，保持用戶的焦點狀態
        }
      }
    }
  }, [currentView, editor, htmlSource]); // 現在可以安全地包含所有依賴項
}
```

### 關鍵改進
1. **使用 useRef 追蹤狀態**: 避免不必要的重新渲染和副作用
2. **精確的條件檢查**: 只在真正需要時設置內容
3. **符合 ESLint 規則**: 包含所有必要的依賴項，無警告
4. **更好的性能**: 減少不必要的 DOM 操作
5. **保持用戶體驗**: 不強制聚焦，保持用戶的焦點狀態

### 對比兩種方案

#### 方案一：排除依賴項 (臨時解決)
```typescript
// ⚠️ 有效但不優雅
useEffect(() => {
  if (currentView === 'visual' && editor) {
    editor.commands.setContent(htmlSource);
    editor.commands.focus('start');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentView, editor]); // 故意排除 htmlSource
```

**問題**: 需要禁用 ESLint 規則，不符合最佳實踐

#### 方案二：使用 useRef 精確控制 (推薦)
```typescript
// ✅ 優雅且正確
// 使用 useRef 追蹤狀態，精確控制何時設置內容
// 包含所有依賴項，符合 ESLint 規則
```

**優勢**: 
- 無 ESLint 警告
- 邏輯更清晰
- 性能更好
- 符合 React 最佳實踐

## 技術教訓

### React useEffect 依賴管理
1. **謹慎選擇依賴項**: 不是所有相關的狀態都應該作為依賴
2. **避免狀態循環**: 當 A 影響 B，B 又影響 A 時要特別小心
3. **明確副作用的觸發條件**: 明確什麼時候應該執行副作用，什麼時候不應該

### TipTap 編輯器最佳實踐
1. **慎用 setContent()**: 只在必要時（如視圖切換）使用，避免在內容更新時調用
2. **理解 onUpdate 觸發時機**: 每次編輯都會觸發，不要在其回調中再次設置內容
3. **游標位置管理**: 避免不必要的 focus() 調用，特別是在用戶正在輸入時

### 調試策略
1. **識別循環**: 當出現重複行為時，檢查是否存在狀態更新循環
2. **檢查依賴數組**: useEffect 的依賴數組是常見問題源
3. **分步調試**: 逐步移除依賴項來定位問題
4. **日誌追蹤**: 在關鍵位置添加 console.log 來追蹤執行流程

## 預防措施

### 代碼審查清單
- [ ] useEffect 的依賴數組是否必要且正確
- [ ] 是否存在狀態更新循環
- [ ] 編輯器相關的副作用是否在正確的時機觸發
- [ ] 是否避免了不必要的內容重置

### 測試策略
- [ ] 在編輯器中輸入字符，確認游標位置正確
- [ ] 切換視圖模式，確認功能正常
- [ ] 測試所有編輯器功能（格式化、插入等）
- [ ] 檢查控制台是否有錯誤或警告

## 總結

這次問題突顯了在 React 應用中管理複雜狀態和副作用的重要性。特別是在處理第三方編輯器組件時，需要深入理解其 API 和生命週期，避免不當的狀態管理導致用戶體驗問題。

**核心原則**: 讓編輯器自然管理自己的狀態，只在必要時進行干預。

---

**修復日期**: 2024年12月19日  
**影響版本**: 所有包含 TipTap 編輯器的版本  
**修復狀態**: ✅ 已完成 