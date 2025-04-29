# 處理進度顯示功能實施計劃

## 現狀分析

1. 項目已有兩個進度顯示組件：
   - `ProcessingProgress.tsx`：較簡單的進度顯示組件
   - `ProgressDisplay.tsx`：更詳細的進度和狀態顯示組件

2. 主頁面中有 `ProgressSection` 組件，但目前使用的是靜態數據，未與實際處理流程集成

3. 文件上傳、處理的 API 已實現，但未實現進度狀態的追蹤和反饋

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

2. **提取內容** (`extract`)
   - 狀態：pending -> processing -> completed/error
   - 功能：從PDF/DOCX提取文本和圖片，或從URL抓取內容
   - API：`/api/process-file` 或 `/api/process-pdf`
   - 輸出：生成初步Markdown文件

3. **內容處理** (`process`)
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

4. **錯誤處理**
   - 任何階段發生錯誤時，設置該階段狀態為 `error`
   - 對於提取階段錯誤，整個流程停止
   - 對於處理階段錯誤，可選擇使用原始內容繼續處理

### 實際處理流程

#### 文件處理流程
1. 用戶上傳文件 -> 觸發 `startFileProcessing`
2. 上傳文件到服務器 -> 更新 `upload` 階段進度
3. 提取文件內容 -> 完成 `upload` 階段 -> 開始 `extract` 階段
4. 內容提取完成 -> 完成 `extract` 階段 -> 開始 `process` 階段
5. OpenAI處理內容 -> 更新 `process` 階段進度
6. 處理完成 -> 完成 `process` 階段 -> 開始和完成 `complete` 階段

#### URL處理流程
1. 用戶輸入URL -> 觸發 `startUrlProcessing`
2. 解析URL -> 更新 `upload` 階段進度
3. 爬取網頁內容 -> 完成 `upload` 階段 -> 開始 `extract` 階段
4. 提取網頁內容 -> 完成 `extract` 階段 -> 開始 `process` 階段
5. OpenAI處理內容 -> 更新 `process` 階段進度
6. 處理完成 -> 完成 `process` 階段 -> 開始和完成 `complete` 階段

### 錯誤處理策略

1. **上傳錯誤**
   - 設置 `upload` 階段為 `error`
   - 顯示錯誤消息，允許用戶重試

2. **提取錯誤**
   - 設置 `extract` 階段為 `error`
   - 顯示錯誤消息，允許用戶重試

3. **處理錯誤**
   - 設置 `process` 階段為 `error`
   - 仍然允許流程繼續到 `complete` 階段
   - 使用原始未處理的內容作為結果
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