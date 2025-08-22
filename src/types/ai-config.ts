/**
 * AI 配置系統類型定義
 */

// 支援的 AI 提供商
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'claude' | 'openrouter';

// 文本生成配置
export interface TextAgentConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  userPrompt: string;
}

// 圖片 Agent 配置
export interface ImageAgentConfig {
  provider: AIProvider;
  model: string;
  size: string;
  quality: 'standard' | 'medium' | 'hd';
  promptTemplate: string;
}

// 完整的 AI 配置
export interface AIConfig {
  contentAgent: TextAgentConfig;      // 步驟3: AI初步內容處理
  prWriterAgent: TextAgentConfig;     // 步驟4: 高級AI處理
  copyEditorAgent: TextAgentConfig;   // 步驟6: 文稿編輯
  imageGeneration: ImageAgentConfig;  // 步驟7: 封面圖生成
  lastUpdated: string;
}

// 預設配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  contentAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一個 30 年經驗的彭博社資深編輯，擅長任何形式的正規專業新聞稿處理。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 若是內容處理涉及翻譯，請確實考量實際語意表達，以免有些詞或標題在翻譯後失去語境含義
3. 進行內容初步處理、整理，使其成為專業的 PR 新聞稿
4. 但需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格...格式和位置相符等
5. 不要遺漏任何重要資訊，或過度簡化格式，仍須遵正客戶所給的原始內容格式和佈局，僅有大錯誤或大問題時，才進行修正
6. 輸出必須保持正確的 Markdown 格式，維持標題層級、段落和列表的格式
7. 不同段落之間不要自己亂加一大堆奇怪的分隔線，未來我們是會轉換成 html 的，所以不要自己亂加分隔線「---」以免未來造成格式隱患`,
    userPrompt: `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿，但必須尊重原始內容，不要遺漏任何重要資訊或錯誤簡化格式或過度進行改寫：

\${markdownContent}`
  },
  prWriterAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一位擁有15年經驗的PR新聞稿專家，專門將普通內容轉換為專業的新聞稿。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 若是內容處理涉及翻譯，請確實考量實際語意表達，以免有些詞或標題在翻譯後失去語境含義
3. 進行內容初步處理、整理，使其成為專業的 PR 新聞稿
4. 但需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格...格式和位置相符等
5. 不要遺漏任何重要資訊，或過度簡化格式，仍須遵正客戶所給的原始內容格式和佈局，僅有大錯誤或大問題時，才進行修正
6. 輸出必須保持正確的 Markdown 格式，維持標題層級、段落和列表的格式
7. 不同段落之間不要自己亂加一大堆奇怪的分隔線，未來我們是會轉換成 html 的，所以不要自己亂加分隔線「---」以免未來造成格式隱患

輸出必須保持正確的Markdown格式，並包含原始內容的所有重要信息。`,
    userPrompt: `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿，但必須尊重原始內容，不要遺漏任何重要資訊或錯誤簡化格式或過度進行改寫：

\${markdownContent}`
  },
  copyEditorAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一位專業的內容分析師和WordPress參數生成專家，負責分析網站文章並生成適合發布的參數和內容。

你的任務是：
1. 仔細分析提供的HTML內容
2. 提取核心信息，生成WordPress發布所需的參數
3. 根據內容適配格式（避免標題和首圖重複出現等）
4. 基於文章內容智能判斷適合的分類和標籤ID

請根據內容分析，生成以下參數的完整JSON結構：
1. title: 文章標題（核心必填）
2. content: 完整的HTML內容（經過適配）
3. excerpt: 文章摘要（若無法提取則創建100-120字的摘要）
4. slug: 網址後綴（基於標題生成的英文短語）
5. categories: 分類ID列表，格式為[{id: 數字}]
6. tags: 標籤ID列表，格式為[{id: 數字}]
7. featured_image: 特色圖片信息（從內容中提取第一張圖片）

🔍 圖片處理重要規則：
- 請從內容中尋找第一張圖片（第一個<img>標籤），將其src屬性提取為featured_image的url
- 在featured_image參數中，提供url和alt屬性
- ⚠️ 關鍵：只移除被提取為特色圖片的那一張圖片，其他所有圖片必須保留在原位置
- 如果文章只有一張圖片，提取後內容中將沒有圖片（這是正常的）
- 如果文章有多張圖片，提取第一張後，其餘圖片必須保持不變
- 如果無法提取圖片URL，請將featured_image設為null

注意事項：
- 必須根據你分析的內容生成適合的參數值
- 分類ID和標籤ID應為數字，請依據內容估計合適的分類和標籤ID
- 如果內容已有H1標題，請確保它不會在WordPress標題和內容中重複出現
- 處理圖片時要格外小心，確保不會意外移除不該移除的圖片

你的輸出格式必須為固定的JSON格式，包含wordpress_params和adaptedContent兩個字段：`,
    userPrompt: `請分析以下HTML或Markdown內容並生成WordPress發布參數。特別注意提取第一張圖片作為特色圖片，並記錄其URL。內容如下：

\${content}`
  },
  imageGeneration: {
    provider: 'openai',
    model: 'gpt-image-1',
    size: '1536x1024',
    quality: 'medium',
    promptTemplate: `Create a professional, modern cover image for an article with the following details:

Title: \${title}
Content Summary: \${contentSummary}
Article Type: \${articleType}

Style Requirements:
- Professional and modern design
- Suitable for tech/business/news article
- Clean, minimal composition
- High contrast and readability
- No text overlay (title will be added separately)
- Color scheme should be professional (blues, grays, whites)
- Abstract or conceptual representation of the topic
- High quality, suitable for web publication

The image should be visually appealing and relevant to the article content while maintaining a professional appearance suitable for a technology/business news website.`
  },
  lastUpdated: new Date().toISOString()
};

// API 請求和響應類型
export interface GetAIConfigResponse {
  success: boolean;
  data?: AIConfig;
  error?: string;
}

export interface SaveAIConfigRequest {
  config: AIConfig;
}

export interface SaveAIConfigResponse {
  success: boolean;
  data?: AIConfig;
  error?: string;
}

export interface ResetAIConfigResponse {
  success: boolean;
  data?: AIConfig;
  error?: string;
}

// Agent 名稱類型
export type AgentName = 'contentAgent' | 'prWriterAgent' | 'copyEditorAgent' | 'imageGeneration';

// 支援的模型定義
export const SUPPORTED_MODELS = {
  openai: {
    text: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.5', 'gpt-4.5-preview', 'o1', 'o1-mini', 'o3', 'o3-mini', 'o4-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'custom'],
    image: ['gpt-image-1', 'custom']
  },
  gemini: {
    text: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'custom'],
    image: ['custom']
  },
  grok: {
    text: ['grok-3', 'grok-2', 'grok-1', 'custom'],
    image: ['custom']
  },
  claude: {
    text: ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3.7-sonnet', 'claude-3-sonnet', 'claude-3-haiku', 'custom'],
    image: ['custom']
  },
  openrouter: {
    text: [
      // OpenAI 模型
      'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/o1-preview', 'openai/o1-mini',
      // Google 模型
      'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.0-flash',
      // Anthropic 模型
      'anthropic/claude-3.5-sonnet', 'anthropic/claude-3.5-haiku', 'anthropic/claude-3-opus',
      // X.AI 模型
      'x-ai/grok-3', 'x-ai/grok-2', 'x-ai/grok-1',
      // Meta 模型
      'meta-llama/llama-3.3-70b', 'meta-llama/llama-3.2-90b',
      // 其他熱門模型
      'mistralai/mistral-large', 'cohere/command-r-plus',
      'custom'
    ],
    image: ['openai/dall-e-3', 'openai/dall-e-2', 'custom']
  }
} as const;

// 圖片尺寸選項
export const IMAGE_SIZES = {
  openai: ['1024x1024', '1536x1024', '1024x1536'],
  midjourney: ['1:1', '4:3', '3:4', '16:9'],
  'stable-diffusion': ['512x512', '768x768', '1024x1024']
} as const;

// 圖片品質選項
export const IMAGE_QUALITY = {
  openai: ['standard', 'hd'],
  midjourney: ['low', 'medium', 'high'],
  'stable-diffusion': ['draft', 'standard', 'high']
} as const; 