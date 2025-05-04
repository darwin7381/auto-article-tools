# 處理進度顯示功能實施計劃

## 現狀分析

1. 項目使用統一的進度顯示組件：
   - `ProgressDisplay.tsx`：詳細的進度和狀態顯示組件，通過ProcessingContext獲取狀態

2. 主頁面中的 `ProgressSection` 組件集成了 `ProgressDisplay`，與實際處理流程完全集成

3. 文件上傳、處理的 API 已實現，並實現了統一的進度狀態的追蹤和反饋

## 處理流程架構

系統採用階段性流水線混合模式，通過統一處理流程管理器(useProcessingFlow)協調各階段：

```
輸入(文件/URL) → [階段完成，前端控制] → 內容提取 → [階段完成，前端控制] → AI處理 → [階段完成，前端控制] → 完成
```

### API層級結構

1. **協調層API**
   - `/api/extract-content`: 根據文件類型選擇處理器，統一協調提取流程

2. **處理器層API**
   - `/api/processors/process-pdf`: 專門處理PDF轉換為DOCX
   - `/api/processors/process-docx`: 專門處理DOCX提取內容
   - `/api/processors/process-gdocs`: 專門處理Google Docs文檔

3. **AI處理層API**
   - `/api/process-openai`: 處理內容增強，包括語言檢測、翻譯等任務

4. **上傳與URL處理API**
   - `/api/upload`: 處理文件上傳
   - `/api/parse-url`: 解析URL並初始化處理
   - `/api/process-url`: 處理URL內容提取

## 模組化實現架構

系統組織為三層架構：

### 1. 核心狀態管理層
- `ProcessingContext`: 中央狀態管理器，提供處理狀態追蹤和更新方法
- 提供狀態更新方法和階段管理API

### 2. 業務邏輯層
- `useProcessingFlow`: 統一處理流程管理器，作為協調器處理整體流程
- 專門階段處理Hooks:
  - `useUploadStage`: 處理上傳階段邏輯
  - `useExtractStage`: 處理內容提取階段邏輯
  - `useAiProcessingStage`: 處理AI增強階段邏輯

### 3. 視圖層
- `ProgressDisplay`: 進度和狀態的可視化組件
- `ProgressSection`: 頁面中的進度區塊容器
- `FileUploadSection`: 處理文件上傳和URL輸入的組件

## 階段性流水線串聯機制

系統使用直接回調串聯而非狀態監聽方式連接各處理階段：

1. **上傳階段完成** → 回調觸發提取階段
   ```typescript
   onFileUploadComplete: async (fileUrl, fileType, fileId) => {
     // 更新上傳階段狀態
     // 直接開始提取階段
     await extractStage.startExtraction({
       inputType: 'file',
       fileUrl,
       fileType,
       fileId
     });
   }
   ```

2. **提取階段完成** → 回調觸發AI處理階段
   ```typescript
   onExtractComplete: async (result) => {
     // 更新提取階段狀態
     // 直接開始AI處理階段
     if (result.markdownKey) {
       await aiProcessingStage.startAiProcessing(result);
     }
   }
   ```

3. **AI處理階段完成** → 回調更新完成狀態
   ```typescript
   onProcessComplete: (result) => {
     // 更新AI處理階段狀態
     // 標記整個處理完成
   }
   ```

這種直接串聯方式相比狀態監聽有以下優勢：
- 避免了循環渲染和狀態更新問題
- 處理流程更直接、可讀性更高
- 錯誤處理更精確
- 性能更好，減少不必要的組件重渲染

## 進度顯示實現

`ProgressDisplay` 組件實現了以下功能：

1. **總體進度顯示**
   - 動畫進度條顯示總體完成百分比
   - 當前處理狀態文本顯示

2. **階段詳細進度**
   - 各處理階段的狀態指示 (待處理/處理中/已完成/錯誤)
   - 當前活躍階段的進度條
   - 階段消息提示

3. **處理元數據顯示**
   - 顯示文件或URL相關信息
   - 顯示處理結果元數據 (如語言、字數等)

4. **進度動畫**
   - 使用requestAnimationFrame實現流暢的進度動畫
   - 階段狀態變化的視覺反饋

## 錯誤處理機制

系統實現了多層錯誤處理：

1. **階段級錯誤處理**
   - 每個階段Hook處理自己的錯誤，並清理資源
   - 通過回調將錯誤向上傳遞

2. **流程級錯誤處理**
   - `useProcessingFlow` 捕獲和處理來自各階段的錯誤
   - 根據錯誤發生的階段決定後續處理策略

3. **UI錯誤顯示**
   - 在進度顯示中清晰標記出錯的階段
   - 顯示具體錯誤信息
   - 提供操作建議 (如重試選項)

## 性能優化

系統實現了以下性能優化：

1. **資源清理**
   - 所有定時器在完成或錯誤時清理
   - 所有Hook提供cleanup方法防止內存泄漏

2. **渲染優化**
   - 階段間直接調用，減少狀態變化和渲染循環
   - 動畫使用requestAnimationFrame而非setTimeout

3. **有限狀態更新**
   - 進度更新使用預估進度減少服務器請求
   - 使用memo和useCallback減少不必要的重新渲染

## 各處理流程實現

系統統一處理了不同類型的輸入：

1. **PDF文件** → PDF轉DOCX → 內容提取 → AI處理
2. **DOCX文件** → 直接內容提取 → AI處理
3. **一般URL** → 網頁爬取 → 內容提取 → AI處理
4. **Google Docs URL** → 專門爬取方法 → 內容提取 → AI處理

統一處理流程使得用戶體驗一致，同時內部處理邏輯根據不同輸入自動調整。

## 執行計劃

### 1. 創建進度狀態管理系統
   - 使用全局狀態管理存儲處理進度和狀態（React Context）
   - 定義處理階段狀態和進度類型

### 2. 實現進度更新機制
   - 在各 API 處理階段添加進度更新邏輯
   - 實現 WebSocket 或輪詢機制，實時獲取後端處理進度

### 3. 集成到現有 UI 組件
   - 修改 `ProgressSection.tsx` 使用 `ProgressDisplay` 組件
   - 將全局狀態連接到 UI 組件

### 4. 優化用戶體驗
   - 實現進度動畫和過渡效果
   - 添加錯誤處理和重試機制

## 實際實現狀態管理

### 處理階段定義

根據實際系統處理流程，我們將處理階段簡化為以下四個主要階段：

1. **上傳文件** (`upload`)
   - 狀態：pending -> processing -> completed/error
   - 功能：接收用戶上傳的PDF/DOCX文件或URL，上傳到服務器
   - API：`/api/upload`

2. **提取內容** (`extract`)
   - 狀態：pending -> processing -> completed/error
   - 功能：從PDF/DOCX提取文本和圖片，或從URL抓取內容
   - API：`/api/extract-content` (協調器)
     - 處理器：`/api/processors/process-pdf` 和 `/api/processors/process-docx`
   - 輸出：生成初步Markdown文件

3. **AI 初步內容處理** (`process`)
   - 狀態：pending -> processing -> completed/error
   - 功能：使用OpenAI進行內容處理，包括語言識別、翻譯、格式優化等
   - API：`/api/process-openai`
   - 處理器：`contentAgent.ts`處理所有內容優化邏輯
   - 輸出：生成增強版Markdown文件

4. **處理完成** (`complete`)
   - 狀態：pending -> processing -> completed
   - 功能：標記整個處理流程完成
   - 結果：顯示處理結果和Markdown文件鏈接

### 狀態管理邏輯

1. **ProcessingContext**
   - 使用React Context存儲和管理處理狀態
   - 提供狀態更新方法和處理邏輯

2. **主要方法**
   - `startFileProcessing`：初始化文件處理流程
   - `startUrlProcessing`：初始化URL處理流程
   - `updateStageProgress`：更新特定階段的進度百分比和消息
   - `completeStage`：標記特定階段完成
   - `setStageError`：設置階段處理錯誤
   - `moveToNextStage`：移動到下一處理階段

3. **進度計算**
   - 每個階段佔總進度的均等比例 (25%)
   - 總體進度 = 已完成階段進度 + 當前階段進度百分比的相應比例
   - 在新API架構下，前端可獲取更準確的進度數據，而非模擬進度

4. **錯誤處理**
   - 任何階段發生錯誤時，設置該階段狀態為 `error`
   - 對於提取階段錯誤，整個流程停止
   - 對於處理階段錯誤，可選擇使用原始內容繼續處理

### 前端實際處理流程

#### 文件處理流程
1. 用戶上傳文件 -> 觸發 `startFileProcessing` -> `/api/upload` -> 返回fileUrl
2. 前端調用 `/api/extract-content` -> 更新「提取內容」階段進度
3. 獲取提取結果 -> 完成「提取內容」階段 -> 觸發 `completeStage('extract')` -> `moveToNextStage()`
4. 前端調用 `/api/process-openai` -> 更新「AI 初步內容處理」階段進度
5. 獲取AI處理結果 -> 完成「AI 初步內容處理」階段 -> 觸發 `completeStage('process')` -> `moveToNextStage()`
6. 更新「處理完成」階段 -> 顯示最終結果 -> 觸發 `completeStage('complete')`

#### URL處理流程
1. 用戶輸入URL -> 觸發 `startUrlProcessing`
2. 解析URL -> 更新 `upload` 階段進度
3. 爬取網頁內容 -> 完成 `upload` 階段 -> 開始 `extract` 階段
4. 提取網頁內容 -> 完成 `extract` 階段 -> 開始 `process` 階段
5. OpenAI處理內容 -> 更新 `process` 階段進度
6. 處理完成 -> 完成 `process` 階段 -> 開始和完成 `complete` 階段

### 錯誤處理策略

1. **上傳錯誤**
   - 設置 `upload` 階段為 `error`，調用 `setStageError('upload', errorMessage)`
   - 顯示錯誤消息，允許用戶重試

2. **提取錯誤**
   - 設置 `extract` 階段為 `error`，調用 `setStageError('extract', errorMessage)`
   - 顯示錯誤消息，允許用戶重試

3. **處理錯誤**
   - 設置 `process` 階段為 `error`，調用 `setStageError('process', errorMessage)`
   - 在新架構下，仍可使用未處理的提取內容
   - 錯誤消息說明處理失敗，但原始內容可用

## 用戶界面交互

1. 進度條顯示總體處理進度百分比
2. 階段指示器顯示當前處理階段和狀態
3. 每個階段的詳細進度和消息提示
4. 錯誤情況下顯示具體錯誤信息
5. 處理完成後顯示結果和Markdown鏈接

## 具體實施步驟

### 步驟一：建立進度狀態管理

1. 創建進度狀態管理 Context 和 Provider：
   - 文件：`src/context/ProcessingContext.tsx`
   - 功能：
     - 定義處理狀態類型
     - 提供狀態管理方法
     - 實現階段進度更新邏輯

2. 提供的主要方法：
   - `startFileProcessing`：開始文件處理
   - `startUrlProcessing`：開始URL處理
   - `updateStageProgress`：更新特定階段進度
   - `completeStage`：完成特定階段
   - `setStageError`：設置階段錯誤
   - `moveToNextStage`：移動到下一處理階段

### 步驟二：連接 Context 到應用

1. 修改 `app/layout.tsx`，添加 Provider：
   - 確保整個應用可以訪問處理狀態

### 步驟三：修改 ProgressSection 使用 Context 數據

1. 更新 `src/components/ProgressSection.tsx`：
   - 連接到處理狀態 Context
   - 根據處理狀態顯示適當的 UI
   - 使用 `ProgressDisplay` 組件顯示詳細進度

### 步驟四：修改文件上傳組件，觸發進度狀態更新

1. 更新 `src/components/FileUploadSection.tsx`：
   - 連接到處理狀態 Context
   - 在上傳過程中更新進度狀態
   - 實現各處理階段的進度更新

2. 主要處理邏輯流程：
   - 文件上傳 -> 提取內容 -> 語言偵測 -> 翻譯 -> 格式優化

### 步驟五：實現後端進度追蹤機制（可選）

1. 創建進度狀態 API：
   - 文件：`src/app/api/process-status/[id]/route.ts`
   - 實現 SSE（Server-Sent Events）進度流

2. 前端連接進度流：
   - 創建 `useProcessingStatus` hook
   - 監聽進度更新並更新 UI

## 預期成果

1. 用戶能夠實時看到文件處理的各個階段和進度
2. 清晰顯示當前處理階段和整體進度百分比
3. 在處理出錯時提供明確的錯誤信息
4. 提供處理過程中的元數據信息（如文件類型、大小、語言等）

## 實施順序

1. 創建進度狀態管理 Context
2. 連接 Context 到應用
3. 更新 ProgressSection 組件
4. 修改文件上傳和處理流程
5. 實現後端進度追蹤（如有必要）

## 技術注意事項

1. 確保處理大文件時的性能優化
2. 實現錯誤恢復機制
3. 確保 UI 更新平滑且無閃爍
4. 設計友好的錯誤和空狀態提示 