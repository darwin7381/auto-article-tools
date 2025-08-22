# AI Provider 整合完整指南

## 概述

本文件記錄了在自動文章工具系統中整合新 AI Provider 的完整流程，基於我們在整合 OpenAI、Google Gemini、Grok、Claude 過程中的實際經驗，確保未來新增 AI Provider 時能避免系統崩潰和常見問題。

## 系統架構概覽

我們的 AI 系統採用動態配置架構：
- **配置存儲**：Cloudflare R2 存儲 JSON 配置文件
- **Agent 系統**：4個核心 Agent（contentAgent、prWriterAgent、copyEditorAgent、imageGeneration）
- **統一 API 層**：`callAIAPI` 函數作為所有 AI Provider 的統一入口
- **前端管理**：React 管理界面用於配置編輯

## 新增 AI Provider 完整檢查清單

### 階段一：類型定義和配置

#### 1. 更新類型定義 (`src/types/ai-config.ts`)

```typescript
// 1.1 添加新的 Provider 類型
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude' | 'YOUR_NEW_PROVIDER';

// 1.2 更新支援模型列表
export const SUPPORTED_MODELS = {
  openai: {
    text: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o1-preview', 'o3-mini', 'custom'],
    image: ['gpt-image-1', 'custom']
  },
  YOUR_NEW_PROVIDER: {
    text: ['model-1', 'model-2', 'custom'],
    image: ['image-model-1', 'custom'] // 如果支援圖片生成
  }
};

// 1.3 更新預設配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  // 為每個 Agent 添加新 Provider 的預設配置選項
};
```

#### 1.4 同步更新 agentUtils.ts 類型定義

**⚠️ 關鍵步驟**：必須同步更新 `src/agents/common/agentUtils.ts` 中的類型：

```typescript
// 更新 agentUtils.ts 中的 AIProvider 類型
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude' | 'YOUR_NEW_PROVIDER';

// 更新 getProviderType 函數
export function getProviderType(provider: string): 'openai' | 'google' | 'YOUR_NEW_PROVIDER' {
  switch (provider.toLowerCase()) {
    case 'google':
    case 'gemini':
      return 'google';
    case 'YOUR_NEW_PROVIDER':
      return 'YOUR_NEW_PROVIDER';
    case 'openai':
    case 'grok':    // Grok 使用 OpenAI 相容 API
    case 'claude':  // Claude 使用 OpenAI 相容 API
    default:
      return 'openai';
  }
}
```

#### 1.4 重要注意事項
- **必須添加 'custom' 選項**：允許用戶輸入自定義模型 ID
- **模型名稱準確性**：確保使用 Provider 官方文檔中的正確模型名稱
- **版本更新**：定期檢查並更新最新可用模型

### 階段二：API 整合層

#### 2. 更新 agentUtils.ts (`src/agents/common/agentUtils.ts`)

```typescript
// 2.1 添加 Provider 類型識別
export function getProviderType(provider: AIProvider): 'openai' | 'google' | 'YOUR_NEW_PROVIDER' {
  switch (provider) {
    case 'openai':
    case 'grok': // Grok 使用 OpenAI 相容 API
    case 'claude': // Claude 使用 OpenAI 相容 API
      return 'openai';
    case 'gemini':
      return 'google';
    case 'YOUR_NEW_PROVIDER':
      return 'YOUR_NEW_PROVIDER';
    default:
      return 'openai';
  }
}

// 2.2 添加模型特殊參數處理
export function isReasoningModel(model: string): boolean {
  return model.startsWith('o1-') || 
         model.startsWith('o3-') ||
         model.startsWith('YOUR_REASONING_MODEL_PREFIX');
}

// 2.3 創建 Provider 專用 API 調用函數
export async function callYourNewProviderAPI(
  agentConfig: AgentConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // 實現您的 Provider API 調用邏輯
  const response = await fetch('YOUR_PROVIDER_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.YOUR_PROVIDER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Provider 特定的請求格式
    })
  });
  
  // 處理回應並返回文本內容
}

// 2.4 更新統一 API 調用函數
export async function callAIAPI(
  agentConfig: AgentConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const providerType = getProviderType(agentConfig.provider);
  
  switch (providerType) {
    case 'openai':
      // OpenAI 相容 API 調用
      break;
    case 'google':
      return await callGeminiAPI(agentConfig, systemPrompt, userPrompt);
    case 'YOUR_NEW_PROVIDER':
      return await callYourNewProviderAPI(agentConfig, systemPrompt, userPrompt);
    default:
      throw new Error(`不支援的 Provider: ${agentConfig.provider}`);
  }
}
```

#### 2.5 關鍵經驗教訓

**API 參數適配**：
```typescript
// 不同 Provider 可能有不同的參數要求
export function createModelAdaptedConfig(agentConfig: AgentConfig) {
  const config: any = {
    model: agentConfig.model,
    temperature: agentConfig.temperature,
    top_p: agentConfig.topP
  };

  // OpenAI o3 系列模型特殊處理
  if (isReasoningModel(agentConfig.model)) {
    config.max_completion_tokens = agentConfig.maxTokens;
    // 移除不支援的參數
    delete config.temperature;
    delete config.top_p;
    delete config.presence_penalty;
    delete config.frequency_penalty;
  } else {
    config.max_tokens = agentConfig.maxTokens;
  }

  return config;
}
```

**⚠️ 重要疏漏：R2 配置架構變更**
在實際實現中，我們從單一 `config/ai-config.json` 改為分離式架構：
```
config/
├── agents/
│   ├── contentAgent.json      # 每個 Agent 獨立配置
│   ├── prWriterAgent.json
│   ├── copyEditorAgent.json
│   └── imageGeneration.json
└── metadata/
    └── last-updated.json      # 元數據
```

**agentUtils.ts 中的 Provider 類型不完整**：
當前 `agentUtils.ts` 中的 `AIProvider` 類型只有 `'openai' | 'google'`，但 `ai-config.ts` 中已包含完整類型。需要統一：

```typescript
// 需要更新 agentUtils.ts 中的類型
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude';
```

### 階段三：環境變數和安全

#### 3. 環境變數配置

```bash
# .env.local
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
YOUR_NEW_PROVIDER_API_KEY=your_new_provider_key

# Cloudflare R2 配置
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT=your_r2_endpoint
```

#### 3.1 安全注意事項
- **絕對不要在代碼中硬編碼 API Key**
- **更新 .gitignore**：確保包含所有可能洩露機密的文件模式
- **使用環境變數**：所有敏感信息都通過環境變數傳遞

### 階段四：前端界面更新

#### 4. 更新 AIConfigManager 組件

```typescript
// src/components/admin/AIConfigManager.tsx

// 4.1 添加 Provider 選項
const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'grok', label: 'Grok' },
  { value: 'claude', label: 'Claude' },
  { value: 'YOUR_NEW_PROVIDER', label: 'Your New Provider' }
];

// 4.2 更新變數提示信息
function getVariableInfo(agentTitle: string): string {
  switch (agentTitle) {
    case 'AI初步內容處理':
    case '高級AI處理':
      return '可用變數：• ${markdownContent} - Markdown格式的文章內容';
    case 'AI上稿編修':
      return '可用變數：• ${content} - HTML或Markdown內容, • ${contentType} - 內容類型(html/markdown)';
    case '封面圖生成':
      return '可用變數：• ${title} - 文章標題, • ${contentSummary} - 內容摘要, • ${articleType} - 文章類型';
    default:
      return '請參考文檔了解可用變數';
  }
}
```

### 階段五：配置文件管理

#### 5. R2 配置文件結構

**⚠️ 重要：我們使用分離式配置架構**
```
config/
├── agents/
│   ├── contentAgent.json      # 步驟3: AI初步內容處理
│   ├── prWriterAgent.json     # 步驟4: 高級AI處理  
│   ├── copyEditorAgent.json   # 步驟6: 文稿編輯
│   └── imageGeneration.json   # 步驟7: 封面圖生成
└── metadata/
    └── last-updated.json      # 配置更新時間戳
```

**API 端點對應**：
- `GET /api/config/ai` - 獲取所有配置（聚合各個 Agent）
- `GET /api/config/ai/agents/[agentName]` - 獲取單一 Agent 配置
- `POST /api/config/ai/agents/[agentName]` - 保存單一 Agent 配置
- `DELETE /api/config/ai/agents/[agentName]` - 刪除單一 Agent 配置

#### 5.1 配置文件範例

```json
// config/agents/contentAgent.json
{
  "provider": "YOUR_NEW_PROVIDER",
  "model": "your-model-name",
  "temperature": 0.3,
  "maxTokens": 16000,
  "topP": 0.95,
  "systemPrompt": "您的系統提示詞...",
  "userPrompt": "您的用戶提示詞，包含變數如 ${markdownContent}"
}
```

#### 5.2 編碼處理
```typescript
// 確保正確的 UTF-8 編碼
export async function uploadJsonToR2(jsonData: any, key: string, fileId?: string): Promise<void> {
  const jsonString = JSON.stringify(jsonData, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8'); // 明確指定編碼
  
  await uploadFileToR2(buffer, key, fileId, 'application/json; charset=utf-8');
}
```

### 階段六：測試和驗證

#### 6. 測試檢查清單

**API 連通性測試**：
```bash
# 使用 curl 測試 API
curl -X POST "YOUR_PROVIDER_API_ENDPOINT" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**前端功能測試**：
- [ ] Provider 選擇下拉菜單顯示正常
- [ ] 模型列表正確載入
- [ ] Custom 模型輸入功能正常
- [ ] 配置保存和載入功能正常
- [ ] 錯誤處理顯示適當訊息

**Agent 整合測試**：
- [ ] 每個 Agent 都能使用新 Provider
- [ ] 變數替換功能正常
- [ ] 錯誤重試機制工作正常
- [ ] 日誌記錄包含 Provider 信息

## 常見問題和解決方案

### 問題 1：模型參數不相容
**症狀**：API 返回 "Unsupported parameter" 錯誤
**解決方案**：在 `createModelAdaptedConfig` 中添加模型特定的參數處理邏輯

### 問題 2：API 回應格式不同
**症狀**：無法正確解析 AI 回應
**解決方案**：為每個 Provider 創建專用的回應處理函數

### 問題 3：編碼問題
**症狀**：中文字符在配置文件中顯示為亂碼
**解決方案**：確保所有文件操作明確指定 UTF-8 編碼

### 問題 4：環境變數洩露
**症狀**：收到 Git 安全警告
**解決方案**：立即撤銷密鑰，更新 .gitignore，使用環境變數

## 最佳實踐

### 1. 錯誤處理
```typescript
try {
  const result = await callNewProviderAPI(config, systemPrompt, userPrompt);
  return result;
} catch (error) {
  console.error(`${providerName} API 調用失敗:`, error);
  
  // 記錄詳細錯誤信息用於調試
  logModelUsage(agentName, config, `API 調用失敗: ${error.message}`);
  
  // 拋出標準化錯誤
  throw new Error(`${providerName} API 調用失敗: ${error.message}`);
}
```

### 2. 日誌記錄
```typescript
export function logModelUsage(agentName: string, config: AgentConfig, message: string) {
  console.log(`🤖 [${agentName}] ${message}`);
  console.log(`📡 提供商: ${config.provider}`);
  console.log(`🧠 模型: ${config.model}`);
  console.log(`🌡️ 溫度: ${config.temperature}`);
  console.log(`📝 最大Token: ${config.maxTokens}`);
}
```

### 3. 配置驗證
```typescript
function validateProviderConfig(provider: AIProvider, config: any): boolean {
  // 基本驗證
  if (!config.model || !config.provider) return false;
  
  // Provider 特定驗證
  switch (provider) {
    case 'YOUR_NEW_PROVIDER':
      return validateYourProviderConfig(config);
    default:
      return true;
  }
}
```

## 部署檢查清單

部署前確認：
- [ ] 所有環境變數已設置
- [ ] R2 配置文件已上傳
- [ ] 前端界面測試通過
- [ ] Agent 整合測試通過
- [ ] 錯誤處理測試通過
- [ ] 日誌記錄正常工作
- [ ] 沒有硬編碼的 API Key
- [ ] .gitignore 已更新

## 維護和監控

### 定期檢查項目
1. **模型可用性**：定期檢查 Provider 是否有新模型發布
2. **API 變更**：關注 Provider API 文檔的更新
3. **性能監控**：監控不同 Provider 的回應時間和成功率
4. **成本控制**：追蹤各 Provider 的使用量和成本

### 版本控制
- 為每個重大更改創建 Git 標籤
- 在 CHANGELOG.md 中記錄 Provider 相關的變更
- 保留配置文件的版本歷史

## 特殊案例：OpenRouter 整合指南

### OpenRouter 是什麼？
OpenRouter 是一個 AI 模型聚合服務，提供統一 API 訪問多個 AI 提供商的模型。

### OpenRouter 整合優勢
- **統一 API**：使用 OpenAI 相容格式
- **成本優化**：自動選擇最便宜的可用模型
- **多模型支援**：一個 API Key 訪問所有模型
- **無需多個 API Key**：簡化密鑰管理

### 整合步驟

#### 1. 類型定義
```typescript
// src/types/ai-config.ts
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude' | 'openrouter';

export const SUPPORTED_MODELS = {
  openrouter: {
    text: [
      'openai/gpt-4o', 
      'anthropic/claude-3.5-sonnet', 
      'google/gemini-2.5-pro',
      'x-ai/grok-3',
      'meta-llama/llama-3.2-70b',
      'custom'
    ],
    image: ['openai/dall-e-3', 'custom']
  }
};
```

#### 2. API 調用配置
```typescript
// src/agents/common/agentUtils.ts
export function getProviderType(provider: string): 'openai' | 'google' | 'openrouter' {
  switch (provider.toLowerCase()) {
    case 'openrouter':
      return 'openrouter';
    // ... 其他 providers
  }
}

// OpenRouter 使用 OpenAI 相容 API，但需要不同的端點和 headers
export function createOpenRouterConfig(agentConfig: AgentConfig) {
  return {
    ...createModelAdaptedConfig(agentConfig),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL,
      'X-Title': 'Auto Article Tools'
    }
  };
}
```

#### 3. 環境變數
```bash
# .env.local
OPENROUTER_API_KEY=your_openrouter_key
```

#### 4. Agent 更新
```typescript
// 在各個 Agent 中添加 OpenRouter 支援
if (providerType === 'openrouter') {
  const config = createOpenRouterConfig(agentConfig);
  const completion = await openaiClient.chat.completions.create({
    ...config,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });
}
```

### OpenRouter 特殊優勢
1. **模型路由**：可以設置 fallback 模型
2. **成本控制**：自動選擇最便宜的模型
3. **統一計費**：所有模型使用一個帳單
4. **無需管理多個 API Key**

## 結論

遵循這個指南可以確保新 AI Provider 的整合過程順利進行，避免系統崩潰和常見陷阱。記住始終先在開發環境中測試，並保持配置文件和代碼的一致性。

OpenRouter 特別適合需要多模型支援但希望簡化管理的場景。

---

**最後更新**：2025年1月
**維護者**：開發團隊
**版本**：1.1
