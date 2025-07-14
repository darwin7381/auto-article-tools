# AI 配置系統設計文檔

## 📋 **需求背景**

編輯反饋現有 AI 處理效果不佳，需要能夠動態調整以下內容：
1. **Prompt 優化** - 系統提示詞和用戶提示詞都需要可調整
2. **AI 提供商選擇** - 不只 OpenAI，還要支援 Gemini、Grok 等
3. **模型選擇** - 不同步驟可以選擇不同的模型

## 🎯 **設計原則**

- **簡潔實用** - 最小化可行產品，快速上線
- **步驟導向** - 前端以處理步驟為主分類，而非技術 Agent 名稱
- **後端簡單** - 不過度工程化，直接對應現有 Agent
- **即時生效** - 配置修改後立即應用，無需重新部署

## 🔧 **涉及的 AI 處理步驟**

根據代碼分析，我們有 4 個使用 AI 的步驟：

| 步驟 | 說明 | 對應 Agent/API | 當前模型 |
|------|------|----------------|----------|
| 步驟3 | AI初步內容處理 | contentAgent | OpenAI gpt-4o |
| 步驟4 | 高級AI處理 (PR Writer) | prWriterAgent | OpenAI gpt-4o |
| 步驟6 | 文稿編輯與WordPress參數生成 | copyEditorAgent | OpenAI gpt-4o |
| 步驟7 | 封面圖生成 | generate-cover-image API | OpenAI gpt-image-1 |

## 🗂️ **數據結構設計**

### 文本生成配置
```typescript
interface TextAgentConfig {
  provider: 'openai' | 'gemini' | 'grok';
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  userPrompt: string;
}
```

### 圖片生成配置
```typescript
interface ImageAgentConfig {
  provider: 'openai' | 'midjourney' | 'stable-diffusion';
  model: string;
  size: string;
  quality: string;
  promptTemplate: string;
}
```

### 完整配置
```typescript
interface AIConfig {
  contentAgent: TextAgentConfig;      // 步驟3
  prWriterAgent: TextAgentConfig;     // 步驟4  
  copyEditorAgent: TextAgentConfig;   // 步驟6
  imageGeneration: ImageAgentConfig;  // 步驟7
  lastUpdated: string;
}
```

## 💾 **存儲方案**

使用 **Cloudflare R2** 存儲配置檔案：
- 檔案路徑: `config/ai-config.json`
- 優勢: 已有基礎設施、程式控制、版本控制、即時生效

## 🌐 **API 設計**

```typescript
// GET /api/config/ai - 獲取所有AI配置
// POST /api/config/ai - 保存所有AI配置
// POST /api/config/ai/reset - 重置為預設值
```

## 🖥️ **前端界面設計**

路由: `/admin/ai-config`

界面結構：
```
AI處理步驟配置
├── 步驟3: AI初步內容處理 (contentAgent)
│   ├── 提供商選擇: [OpenAI ▼]
│   ├── 模型選擇: [gpt-4o ▼]
│   ├── 參數調整: 溫度、最大Token、Top-P
│   ├── 系統提示詞: [大文本框]
│   └── 用戶提示詞: [大文本框]
├── 步驟4: 高級AI處理 (prWriterAgent)
├── 步驟6: 文稿編輯 (copyEditorAgent)
├── 步驟7: 封面圖生成 (imageGeneration)
└── [保存配置] [重置為預設] [匯出配置]
```

## 🔄 **實現步驟**

1. **創建配置管理服務** - 處理 R2 讀寫
2. **創建 API 端點** - 配置的 CRUD 操作
3. **修改現有 Agent** - 支援動態讀取配置
4. **創建前端管理界面** - 讓編輯可以調整配置
5. **多 AI 提供商支援** - 實現統一的 AI 調用接口

## 🚀 **預期效果**

- 編輯可以即時調整 Prompt 和 AI 參數
- 支援多種 AI 提供商和模型選擇
- 無需修改代碼即可優化 AI 處理效果
- 保持系統簡潔，易於維護和擴展

## 📝 **注意事項**

- 配置修改後立即生效，無需重新部署
- 支援配置匯出/匯入，方便備份和遷移
- 錯誤處理：配置讀取失敗時回退到硬編碼預設值
- 向後兼容：保持現有 Agent 接口不變 