# AI Agents 架構設計

## 設計理念

在「文件處理與WordPress發布系統」中，我們採用了專門的「AI Agents」架構來處理複雜的AI輔助任務。這種設計區別於傳統的服務層設計，將AI功能視為專門的「Agent」（代理人），而非簡單的服務。

### 為什麼使用Agent架構？

1. **職責明確**：Agent不只是服務，它是一種特殊的處理單元，擁有自己的業務邏輯和執行流程
2. **易於擴展**：隨著我們可能添加更多複雜的AI處理邏輯，獨立的Agent架構更容易管理
3. **接口一致**：所有Agent可以遵循共同的接口和約定
4. **開發分工**：便於AI提示工程師與後端開發的分工合作

## 架構詳解

```
src/
├── agents/                # 專門管理所有AI任務處理者
│   ├── contentAgent.ts    # 內容處理Agent
│   ├── prWriterAgent.ts   # PR新聞稿處理Agent
│   ├── index.ts           # 統一導出
│   └── common/            # 共用的Agent工具
│       └── agentUtils.ts  # 通用工具函數（含重試機制）
├── app/
│   └── api/               # API路由層
│       ├── process-openai/      # 基本內容處理API
│       └── advanced-ai-processing/ # 高級AI處理API
├── services/              # 業務服務層
│   ├── storage/           # 存儲相關服務
│   ├── document/          # 文檔處理服務
│   └── ...                # 其他業務服務
```

### 處理流程與重試機制

項目主要依賴兩個AI處理API路由：
- `/api/process-openai` - 由 `contentAgent` 處理，負責基本內容處理
- `/api/advanced-ai-processing` - 由 `prWriterAgent` 處理，負責PR新聞稿增強

完整處理流程如下：
```
上傳階段 → 提取階段 → AI初步處理階段(process-openai) → 高級AI處理階段(advanced-ai-processing) → 格式轉換階段
```

每個AI處理節點都實現了多層次重試保護：

```
客戶端請求
    ↓
API路由層 (route.ts) → 整體流程重試
    ↓
Agent業務層 (Agent.ts) → 業務邏輯重試
    ↓
AI調用層 (OpenAI Client) → API調用重試
    ↓
處理結果返回
```

### Agents 與 Services 的區別

| 特性 | Agents | Services |
|------|--------|----------|
| 職責 | 處理複雜的AI任務和智能決策 | 處理基礎業務邏輯和數據操作 |
| 依賴 | 依賴外部AI服務（如OpenAI） | 通常是自包含的業務邏輯 |
| 狀態 | 可能需要維護複雜上下文 | 傾向於無狀態設計 |
| 錯誤處理 | 實現多層重試機制與降級策略，處理AI服務特有問題（如超時、模型錯誤） | 標準的錯誤處理，通常不需要複雜重試邏輯 |
| 接口設計 | 通常更加靈活可變 | 傾向於固定的接口設計 |
| 處理策略 | 可能調整參數配置適應不同任務 | 固定的處理邏輯和標準流程 |

## Agent 組件

### 1. contentAgent (內容處理Agent)

負責處理文檔內容的增強，包括：
- 自動將非繁體中文內容翻譯為繁體中文
- 優化Markdown格式和結構
- 保留原始內容的關鍵信息

主要方法：
- `processContent` - 直接處理Markdown文本
- `enhanceMarkdown` - 從R2獲取Markdown並處理，包含完整工作流

### 2. agentUtils (Agent工具函數)

提供所有Agent可共用的工具函數：
- `formatSystemPrompt` - 格式化系統提示詞
- `withFallback` - 實現安全的回退機制
- `measurePerformance` - 測量Agent性能指標

## 使用方式

### 在API層使用Agent

```typescript
import { enhanceMarkdown } from '@/agents/contentAgent';

// 在API路由中
export async function POST(request: Request) {
  // ...
  const result = await enhanceMarkdown(fileId, markdownKey);
  // ...
}
```

### 擴展新的Agent

當需要添加新的AI功能時，可以創建新的Agent文件：

```typescript
// src/agents/summaryAgent.ts
export async function generateSummary(content: string): Promise<string> {
  // 實現摘要生成邏輯
}
```

然後在索引文件中導出：

```typescript
// src/agents/index.ts
export * from './contentAgent';
export * from './summaryAgent'; // 新增Agent
```

## 未來規劃

1. **Agent間協作**：實現多個Agent協同工作的能力
2. **更多專業Agent**：添加專門的翻譯Agent、SEO優化Agent等
3. **Agent選擇策略**：根據任務自動選擇最適合的Agent
4. **性能優化**：實現Agent操作的緩存和併發處理
5. **錯誤處理與重試機制增強**：
   - 集中式錯誤監控與統計分析
   - 基於歷史錯誤模式的自適應重試策略
   - 環境感知型重試（根據生產/測試環境調整重試策略）
   - 基於令牌桶的重試限流機制
6. **故障自愈能力**：
   - 實現服務自診斷功能，自動檢測和修復常見問題
   - 添加熔斷機制，防止系統過載
   - 實現更完善的降級策略，確保核心功能可用性
7. **監控與可觀測性**：
   - 重試事件的詳細指標收集與分析
   - AI處理效能與穩定性儀表板
   - 錯誤原因自動分類與趨勢分析

## 最佳實踐

1. 每個Agent應專注於單一職責
2. 提供清晰的錯誤處理和回退機制
3. 保持Agent接口的一致性
4. 在Agent中實現詳細的日誌記錄
5. 定期評估和優化提示詞設計

## 錯誤處理與重試機制

在AI處理流程中，網絡波動、服務超時或臨時性API錯誤是常見問題。我們實現了強健的分層重試機制，確保生產環境中能處理這些暫時性故障，提高系統穩定性。

### 重試架構設計

我們採用了「分層重試」架構，將重試邏輯實現在多個層級：

```
API路由層 (外層) → Agent業務層 (內層) → API調用層 (最內層)
```

#### 分層重試優勢

1. **更全面的錯誤覆蓋**：不同層級可捕獲不同類型的錯誤
2. **粒度控制**：內層處理細粒度操作失敗，外層處理整體流程失敗
3. **降級策略**：當內層重試失敗時，外層可實施不同的降級策略

#### 重試機制核心組件

在 `src/agents/common/agentUtils.ts` 中實現的通用重試工具函數：

```typescript
/**
 * 自動重試機制 - 對AI處理操作進行自動重試
 * @param operation 要重試的操作函數
 * @param options 重試選項
 * @returns 操作結果
 */
export async function withRetry<T>(
  operation: () => Promise<T>, 
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (error: Error, retryCount: number) => void;
    retryCondition?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  const onRetry = options.onRetry ?? ((error, count) => 
    console.warn(`重試 #${count}，錯誤:`, error.message));
  const retryCondition = options.retryCondition ?? (() => true);
  
  // 重試邏輯實現...
}
```

### 重試機制實現層級

1. **Agent層實現** (contentAgent.ts, prWriterAgent.ts)
   - 重試 OpenAI API 調用
   - 保存處理結果到儲存服務
   - 特點：細粒度控制，專注於特定操作

2. **API路由層實現** (process-openai/route.ts, advanced-ai-processing/route.ts)
   - 重試整個處理流程
   - 處理請求解析和響應格式化
   - 特點：端到端保護，處理邊界情況

### 可重試錯誤類型

我們設計了智能錯誤識別機制，僅對特定類型的錯誤進行重試：

```typescript
const retryableErrors = [
  'timeout', 
  'exceeded maximum time', 
  'rate limit', 
  'server error',
  'network error',
  'Gateway Timeout',
  'timed out',
  'not valid JSON'
];

return retryableErrors.some(errText => 
  errorMessage.toLowerCase().includes(errText.toLowerCase())
);
```

### 重試策略配置

1. **最大重試次數**：預設為 3 次，可根據操作重要性調整
2. **退避延遲**：基本延遲（預設1000ms）× 嘗試次數，實現指數退避
3. **重試條件**：自定義判斷函數，決定哪些錯誤需要重試
4. **重試通知**：可配置回調函數，記錄每次重試的詳細信息

### 重試機制最佳實踐

1. **避免無限重試**：始終設置合理的最大重試次數（3-5次）
2. **實施退避策略**：每次重試增加延遲時間，避免對服務造成壓力
3. **精確的錯誤分類**：只對可恢復的臨時性錯誤進行重試
4. **完整的日誌記錄**：記錄每次重試的原因、次數和結果
5. **降級機制**：所有重試失敗後，提供合理的降級選項（如返回原始內容）

### 項目中的重試實現示例

在 PR Writer Agent 中的應用：

```typescript
// 使用重試機制調用API
const content = await withRetry(
  async () => {
    const completion = await openaiClient!.chat.completions.create({...});
    return completion.choices[0].message.content;
  },
  {
    maxRetries: 3,
    retryDelay: 2000,
    onRetry: (error, count) => {
      console.warn(`PR Writer處理重試 #${count}：`, error.message);
    },
    retryCondition: (error) => {
      // 根據錯誤類型決定是否重試
      const errorMessage = error instanceof Error ? error.message : String(error);
      return retryableErrors.some(errText => 
        errorMessage.toLowerCase().includes(errText.toLowerCase())
      );
    }
  }
);
```

## OpenAI模型參數配置指南

在開發與優化AI Agents時，合理配置OpenAI模型參數對於性能和效果至關重要。以下是關鍵參數的詳細說明和建議配置。

### 核心參數一覽表

| 參數 | 範圍 | 建議值 | 簡述 |
|------|------|--------|------|
| model | 見下方模型列表 | GPT-4o | 選擇使用的AI模型 |
| temperature | 0.0-2.0 | 0.2-0.4 (新聞處理)<br>0.7-0.9 (創意內容) | 控制生成的隨機性 |
| max_tokens | 1-模型上限 | 16000 (大多數情況)<br>4000 (簡短回應) | 輸出回應的最大長度 |
| top_p | 0.0-1.0 | 0.95 | 核採樣閾值（詞彙選擇範圍控制） |
| frequency_penalty | -2.0-2.0 | 0.2 (減少重複) | 重複詞彙的懲罰系數 |
| presence_penalty | -2.0-2.0 | 0.1 (鼓勵多樣性) | 新話題引入的懲罰系數 |
| seed | 整數 | 固定值(如123) | 控制隨機生成的確定性 |

### 核心參數詳細說明

#### temperature（溫度參數）
- **作用原理**：直接調整生成過程中下一個詞的概率分佈。
- **數值影響**：
  - **低值（0.0-0.4）**：使模型更確定、一致、保守，傾向選擇高概率詞彙
  - **高值（0.7-2.0）**：使模型更冒險、創新、多樣，會考慮較低概率的詞彙
- **適用場景**：
  - 低溫度適合事實性內容、新聞處理、資料摘要
  - 高溫度適合創意寫作、頭腦風暴、多樣化回應

#### top_p（核心採樣閾值）
- **作用原理**：控制模型考慮的詞彙概率質量累積閾值（機率總和）。
- **數值影響**：
  - **低值（0.1-0.4）**：模型僅考慮最高概率的少數詞彙，產生較保守、可預測的回應
  - **高值（0.9-1.0）**：模型考慮更廣範圍的詞彙，包括較不常見的選擇，產生更多樣的回應
- **與temperature的區別**：temperature調整整體概率分布；top_p則是截斷考慮的候選詞彙池。
- **實際應用**：
  - 設為0.1時，模型僅考慮概率總和達到10%的詞彙
  - 設為0.95（常用）時，模型考慮概率總和達到95%的詞彙，提供良好的多樣性平衡

#### max_tokens（最大輸出長度）
- **作用原理**：限制模型單次回應可生成的最大token數量。
- **注意事項**：
  - 不是字符數，而是token數（一個英文單詞通常為1-2個tokens，中文每個字約為1-2個tokens）
  - 設置過低可能導致回應不完整或突然終止
  - 設置過高會增加API成本和處理時間
- **建議設置**：根據預期回應長度的1.5-2倍設置，通常情況不需要設為最大值

#### frequency_penalty（重複詞彙懲罰）
- **作用原理**：根據詞彙在已生成文本中的出現頻率進行懲罰調整。
- **數值影響**：
  - **正值（0.1-2.0）**：降低已出現詞彙的重複使用概率，產生更多樣化的表達
  - **負值（-2.0-0）**：增加已使用詞彙的重複概率，可能導致重複或循環
- **適用場景**：
  - 技術文檔編寫時使用適中正值（0.2-0.5）可減少重複詞句
  - 詩歌或有意重複的創作可使用低值或負值

#### presence_penalty（新話題引入的懲罰系數）
- **作用原理**：根據詞彙是否已在文本中出現過（無論頻率）進行懲罰調整。
- **數值影響**：
  - **正值（0.1-2.0）**：鼓勵模型引入新概念和話題，使內容更豐富多變
  - **負值（-2.0-0）**：鼓勵模型保持對已提及主題的專注，減少偏離
- **與frequency_penalty區別**：presence僅考慮詞彙是否出現過；frequency考慮出現頻率。

#### seed（隨機種子）
- **作用原理**：固定隨機數生成器的初始狀態，使相同輸入在相同參數下產生相似結果。
- **實用價值**：
  - 提高結果的可重複性和一致性
  - 便於進行A/B測試比較不同提示詞效果
  - 生產環境中確保處理的穩定性
- **注意事項**：即使使用相同seed，不同版本的模型或不同時間的調用仍可能有細微差異

### 模型選擇指南

| 模型 | 上下文窗口 | 最大輸出 | 適用場景 | 特點 |
|------|------------|----------|----------|------|
| GPT-4o | 128K tokens | 16K tokens | 通用處理、格式轉換 | 高效能通用型，成本效益最佳 |
| O3 | 200K tokens | 100K tokens | 深度分析、複雜推理 | 增強推理能力，適合複雜任務 |
| GPT-4.1 | 1,000,000 tokens | 32K tokens | 超長文檔、書籍處理 | 超長上下文理解，高級推理 |
| GPT-4o-mini | 128K tokens | 16K tokens | 輕量處理、初步分類 | 降低成本，適合批量處理 |

### 進階參數說明

1. **response_format**: 指定輸出格式
   - `{ "type": "json_object" }` - 強制JSON格式輸出
   - 適用於需要結構化數據的場景

2. **logit_bias**: 調整特定token的出現概率
   - 值範圍: -100 到 100
   - 正值增加詞彙出現概率，負值降低
   - 適用於控制特定術語或風格

3. **stop**: 設置生成停止標記
   - 可以是字符串或字符串數組
   - 當生成內容包含stop標記時終止生成
   - 適用於控制輸出格式，如對話終止

4. **stream**: 流式輸出控制
   - true/false
   - 開啟可實現實時輸出效果
   - 適用於需要即時反饋的介面

### 特定任務參數配置建議

#### 新聞處理與格式轉換
```javascript
{
  model: "gpt-4o",
  temperature: 0.3,
  max_tokens: 16000,
  top_p: 0.95,
  frequency_penalty: 0.2,
  presence_penalty: 0.1,
  seed: 123
}
```

#### 深度內容分析
```javascript
{
  model: "o3",
  temperature: 0.2,
  max_tokens: 32000,
  top_p: 0.92,
  frequency_penalty: 0.3,
  presence_penalty: 0.1,
  seed: 123
}
```

#### 批量文檔處理
```javascript
{
  model: "gpt-4o-mini",
  temperature: 0.4,
  max_tokens: 8000,
  top_p: 0.98,
  frequency_penalty: 0.1,
  presence_penalty: 0.0,
  seed: 123
}
```

### 參數調優最佳實踐

1. **設定基準配置**：為每種Agent任務確定基準參數組合
2. **A/B測試**：通過控制變量法測試不同參數對結果的影響
3. **保存範例輸出**：記錄不同參數配置的輸出範例以便對比
4. **根據任務調整**：特定任務可能需要特定參數組合
5. **監控成本與效果**：較高的max_tokens可能增加成本，需平衡

### 參數更新與維護

定期檢查OpenAI文檔以了解：
1. 新模型的發布與特性
2. 參數範圍或行為的變化
3. 新增的參數選項
4. 模型性能優化建議

每季度至少審查一次參數配置，確保始終使用最優方案。 