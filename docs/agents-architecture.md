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
│   ├── index.ts           # 統一導出
│   └── common/            # 共用的Agent工具
│       └── agentUtils.ts  # 通用工具函數
├── services/              # 業務服務層
│   ├── storage/           # 存儲相關服務
│   ├── document/          # 文檔處理服務
│   └── ...                # 其他業務服務
```

### Agents 與 Services 的區別

| 特性 | Agents | Services |
|------|--------|----------|
| 職責 | 處理複雜的AI任務和智能決策 | 處理基礎業務邏輯和數據操作 |
| 依賴 | 依賴外部AI服務（如OpenAI） | 通常是自包含的業務邏輯 |
| 狀態 | 可能需要維護複雜上下文 | 傾向於無狀態設計 |
| 錯誤處理 | 需要強健的回退機制 | 標準的錯誤處理 |
| 接口設計 | 通常更加靈活可變 | 傾向於固定的接口設計 |

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

## 最佳實踐

1. 每個Agent應專注於單一職責
2. 提供清晰的錯誤處理和回退機制
3. 保持Agent接口的一致性
4. 在Agent中實現詳細的日誌記錄
5. 定期評估和優化提示詞設計 