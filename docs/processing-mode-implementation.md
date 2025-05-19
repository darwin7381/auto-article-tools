# 自動、半自動與手動模式實現方案

## 1. 需求背景與模式定義

根據`wordpress-auto-params-design.md`文檔，系統需要支持三種混合操作模式：

1. **全自動模式**：系統自動完成所有處理階段，包括自動確認「上稿準備」和「上架新聞」階段，無需用戶手動確認進入下一階段
2. **半自動模式**：全自動流程完成後，若用戶對最終結果不滿意，可以回到「上稿準備」或「上架新聞」階段進行微調
3. **手動模式**：用戶需在「上稿準備」和「上架新聞」這兩個階段手動確認後才進入下一步

實際操作上，我們只需要實現「自動模式」和「手動模式」兩種選項：
- **自動模式** 對應上述的全自動模式，系統自動確認「上稿準備」和「上架新聞」階段
- **手動模式** 對應上述的手動模式，需要用戶手動確認這兩個階段

而半自動模式的功能（允許用戶返回先前階段進行調整）已經在系統中自帶實現，無論選擇哪種模式，用戶都可以返回上一階段進行編輯。

## 2. 現有系統分析

當前系統有以下特點：

1. 使用階段性流水線處理模式，自動執行前6個階段
2. 「上稿準備」和「上架新聞」階段已經實現了手動確認機制
3. 用戶可以在這兩個階段查看和編輯內容，並手動點擊確認按鈕繼續流程
4. 系統已經具備完整的確認機制，只需添加自動模式選項

## 3. 實現方案

### 3.1 設計概述

只需在文件上傳階段添加一個處理模式選擇選項，並將其存儲在ProcessingContext中：

1. 添加一個下拉式按鈕或單選框，讓用戶選擇「自動模式」或「手動模式」
2. 將選擇的模式存儲在ProcessingContext中
3. 在「上稿準備」和「上架新聞」階段檢查模式，決定是否自動繼續

### 3.2 模式選擇界面

在文件上傳頁面頂部添加模式選擇：

```tsx
// 模式選擇組件
const ProcessingModeSelector = ({ 
  isAutoMode, 
  onChange 
}: { 
  isAutoMode: boolean, 
  onChange: (isAuto: boolean) => void 
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          處理模式：
        </label>
        <select 
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm" 
          value={isAutoMode ? 'auto' : 'manual'}
          onChange={(e) => onChange(e.target.value === 'auto')}
        >
          <option value="auto">自動模式</option>
          <option value="manual">手動模式</option>
        </select>
        <button 
          type="button"
          className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
          title="處理模式說明"
          onClick={() => alert('自動模式: 全流程自動執行，無需手動確認\n手動模式: 需要手動確認上稿準備和上架新聞階段')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};
```

### 3.3 擴展ProcessingContext

添加處理模式相關狀態：

```typescript
// 在ProcessingContext中添加
// 處理模式類型
export type ProcessingMode = 'auto' | 'manual';

// 處理參數類型，用於未來擴展
export interface ProcessingParams {
  mode: ProcessingMode;
  useWatermark?: boolean;        // 使用浮水印
  autoGenerateFeaturedImage?: boolean; // 自動生成首圖
  editorLabel?: string;          // 廣編標示
  autoSEO?: boolean;             // 自動SEO優化
  imageSources?: string[];       // 圖像來源
  pdfOptions?: {                 // PDF處理選項
    extractTables?: boolean;     // 提取表格
    extractImages?: boolean;     // 提取圖片
  };
  // 未來可添加更多參數
}

// 默認參數
const defaultProcessingParams: ProcessingParams = {
  mode: 'manual',               // 默認為手動模式
  useWatermark: false,
  autoGenerateFeaturedImage: false,
  autoSEO: false
};

// 狀態和更新方法
const [processingParams, setProcessingParams] = useState<ProcessingParams>(defaultProcessingParams);

// 更新處理參數的方法
const updateProcessingParams = useCallback((newParams: Partial<ProcessingParams>) => {
  setProcessingParams(prev => ({
    ...prev,
    ...newParams
  }));
}, []);

// 添加到context值中
const contextValue = {
  // 現有屬性
  processState,
  stages,
  // 新增屬性和方法
  processingParams,
  updateProcessingParams
};
```

### 3.4 自動確認實現

在需要手動確認的階段添加自動確認邏輯：

```tsx
// 上稿準備階段的自動確認
useEffect(() => {
  // 僅在自動模式下執行
  if (processingParams.mode === 'auto' && 
      processState?.currentStage === 'prep-publish' && 
      processState.stages.find(s => s.id === 'prep-publish')?.status === 'processing') {
    
    // 自動點擊確認按鈕，進入下一階段
    setTimeout(() => {
      // 移動到下一階段
      moveToNextStage();
      
      // 更新狀態
      updateProcessState({
        currentStage: 'publish-news',
        stages: processState.stages.map(s => 
          s.id === 'publish-news' 
            ? { ...s, status: 'processing', progress: 10, message: '準備WordPress發布設定...' }
            : s
        )
      });
    }, 1000); // 短暫延遲，讓用戶看到階段完成
  }
}, [processingParams.mode, processState?.currentStage, processState?.stages]);

// 上架新聞階段的自動確認 (自動點擊發布按鈕)
useEffect(() => {
  // 僅在自動模式下執行
  if (processingParams.mode === 'auto' && 
      processState?.currentStage === 'publish-news' && 
      processState.stages.find(s => s.id === 'publish-news')?.status === 'processing' && 
      !isSubmitting && !publishResult) {
    
    // 自動點擊發布按鈕
    setTimeout(() => {
      if (formData.title.trim()) {
        handlePublish();
      }
    }, 1000);
  }
}, [processingParams.mode, processState?.currentStage, processState?.stages, isSubmitting, publishResult]);
```

## 4. 未來擴展性考慮

### 4.1 處理參數配置界面

為了支持未來添加更多處理參數，我們設計一個可擴展的處理選項界面：

```tsx
// 未來的處理參數配置界面
const ProcessingOptionsPanel = ({
  params,
  onChange
}: {
  params: ProcessingParams,
  onChange: (params: Partial<ProcessingParams>) => void
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="font-medium mb-3">處理選項</h3>
      
      {/* 處理模式選擇 */}
      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">處理模式</label>
          <select
            value={params.mode}
            onChange={(e) => onChange({ mode: e.target.value as ProcessingMode })}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          >
            <option value="auto">自動模式</option>
            <option value="manual">手動模式</option>
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {params.mode === 'auto' 
            ? '系統將自動完成所有處理階段，無需手動確認' 
            : '上稿準備與上架新聞階段需要手動確認'}
        </p>
      </div>
      
      {/* 圖像處理選項 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">圖像處理</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useWatermark"
              checked={params.useWatermark}
              onChange={(e) => onChange({ useWatermark: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="useWatermark" className="ml-2 text-sm">添加浮水印</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoGenerateFeaturedImage"
              checked={params.autoGenerateFeaturedImage}
              onChange={(e) => onChange({ autoGenerateFeaturedImage: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="autoGenerateFeaturedImage" className="ml-2 text-sm">自動生成首圖</label>
          </div>
        </div>
      </div>
      
      {/* 編輯處理選項 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">編輯選項</h4>
        <div className="space-y-3">
          <div>
            <label htmlFor="editorLabel" className="block text-sm mb-1">廣編標示</label>
            <input
              type="text"
              id="editorLabel"
              value={params.editorLabel || ''}
              onChange={(e) => onChange({ editorLabel: e.target.value })}
              placeholder="例: 業配/廣告/合作"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSEO"
              checked={params.autoSEO}
              onChange={(e) => onChange({ autoSEO: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="autoSEO" className="ml-2 text-sm">自動SEO優化</label>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4.2 參數傳遞和使用

各處理階段根據參數調整處理行為：

```typescript
// 範例：在AI處理階段使用處理參數
const processContent = async () => {
  // 獲取處理參數
  const { autoGenerateFeaturedImage, autoSEO, editorLabel } = processingParams;
  
  // 構建請求參數
  const requestParams = {
    content: markdownContent,
    generateImage: autoGenerateFeaturedImage,
    optimizeSEO: autoSEO,
    ...(editorLabel ? { sponsoredContent: editorLabel } : {})
  };
  
  // 使用參數調用API
  const response = await fetch('/api/advanced-ai-processing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestParams)
  });
  
  // 處理響應...
};
```

## 5. 實現步驟

1. **第一階段：基本模式選擇**
   - 在ProcessingContext中添加模式相關狀態
   - 在上傳頁面添加模式選擇下拉框
   - 實現自動確認邏輯

2. **第二階段：擴展處理參數**
   - 添加更多處理參數（浮水印、首圖生成等）
   - 設計高級選項面板
   - 調整API以支持新參數

3. **第三階段：參數持久化與預設**
   - 添加預設設置功能
   - 實現參數保存功能
   - 添加批量處理設置

## 6. 測試計劃

1. **模式切換測試**
   - 測試自動模式是否正確自動確認階段
   - 測試手動模式是否正確要求確認
   - 測試模式切換時的行為變化

2. **參數功能測試**
   - 測試各參數對處理結果的影響
   - 測試參數組合的相互作用
   - 測試參數持久化功能

## 7. 總結

處理模式實現採用漸進式方法，先實現基本的自動和手動模式選擇，再擴展更多處理參數。該設計充分考慮了未來擴展性，能夠靈活支持新增的處理參數和選項，通過統一的參數管理接口，各階段處理組件可以輕鬆獲取並使用相關參數，實現處理行為的定制化。 