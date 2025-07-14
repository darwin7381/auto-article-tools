/**
 * Agent 工具函數集合
 * 提供與AI Agent相關的公共工具和幫助函數
 */

import { getJsonFromR2 } from '../../services/storage/r2Service';

// 定義 Agent 配置類型
export interface AgentConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  systemPrompt: string;
  userPrompt: string;
}

// 定義支援的提供商
export type AIProvider = 'openai' | 'google';

// Gemini 專用配置介面
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiRequest {
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  contents: GeminiMessage[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topP?: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount?: number;
    totalTokenCount: number;
  };
}

/**
 * 格式化系統提示詞
 * @param basePrompt 基礎提示內容
 * @param options 可選配置
 * @returns 格式化後的系統提示詞
 */
export function formatSystemPrompt(basePrompt: string, options?: {
  includeInstructions?: string[];
}): string {
  let prompt = basePrompt;
  
  // 添加額外指示
  if (options?.includeInstructions?.length) {
    prompt += '\n\n額外指示:\n';
    options.includeInstructions.forEach((instruction, index) => {
      prompt += `${index + 1}. ${instruction}\n`;
    });
  }
  
  return prompt;
}

/**
 * 創建基本的ChatGPT API配置
 * @param model 模型名稱
 * @param options 模型選項
 * @returns API 配置對象
 */
export function createChatConfig(model: string = "gpt-4o", options?: {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
}) {
  return {
    model,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
    top_p: options?.top_p,
    frequency_penalty: options?.frequency_penalty,
    presence_penalty: options?.presence_penalty,
    seed: options?.seed,
  };
}

/**
 * 判斷提供商類型
 * @param provider 提供商名稱
 * @returns 提供商類型
 */
export function getProviderType(provider: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'google':
    case 'gemini':
      return 'google';
    case 'openai':
    default:
      return 'openai';
  }
}

/**
 * 檢查是否為 Gemini 模型
 * @param model 模型名稱
 * @returns 是否為 Gemini 模型
 */
export function isGeminiModel(model: string): boolean {
  const geminiModels = [
    'gemini-2.5-pro', 'gemini-2.5-flash', 
    'gemini-2.0-flash', 'gemini-2.0-flash-exp',
    'gemini-1.5-pro', 'gemini-1.5-flash'
  ];
  return geminiModels.some(geminiModel => model.startsWith(geminiModel));
}

/**
 * 檢查模型是否為推理模型（需要使用 max_completion_tokens 且不支援採樣參數）
 * @param model 模型名稱
 * @returns 是否為推理模型
 */
export function isReasoningModel(model: string): boolean {
  const openaiReasoningModels = [
    'o1', 'o1-preview', 'o1-mini', 'o1-pro',
    'o3', 'o3-mini', 'o3-pro', 
    'o4-mini', 'o4-mini-high'
  ];
  
  const geminiReasoningModels = [
    'gemini-2.5-pro' // Gemini Pro 模型有推理能力
  ];
  
  return openaiReasoningModels.some(reasoningModel => model.startsWith(reasoningModel)) ||
         geminiReasoningModels.some(reasoningModel => model.startsWith(reasoningModel));
}

/**
 * 調用 Gemini API
 * @param agentConfig Agent配置
 * @param systemPrompt 系統提示詞
 * @param userPrompt 用戶提示詞
 * @returns AI回應內容
 */
export async function callGeminiAPI(
  agentConfig: AgentConfig, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 環境變數未設置');
  }

  // 使用正確的 Gemini API 格式 - 分離 systemInstruction 和 contents
  const request: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: userPrompt }]
    }],
    generationConfig: {
      temperature: agentConfig.temperature,
      maxOutputTokens: agentConfig.maxTokens,
      topP: agentConfig.topP || 0.95
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${agentConfig.model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 調用失敗: ${response.status} - ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API 回應為空');
  }

  const content = data.candidates[0]?.content?.parts[0]?.text;
  if (!content) {
    throw new Error('Gemini API 回應內容為空');
  }

  return content;
}

/**
 * 創建適配不同模型的API配置（僅用於 OpenAI）
 * @param agentConfig Agent配置
 * @returns API 配置對象
 */
export function createModelAdaptedConfig(agentConfig: AgentConfig) {
  // 根據模型類型使用不同的參數配置
  if (isReasoningModel(agentConfig.model)) {
    // 推理模型（o1, o3, etc.）：只支援基本參數
    return {
      model: agentConfig.model,
      max_completion_tokens: agentConfig.maxTokens
      // 注意：推理模型不支援 temperature, top_p, presence_penalty, frequency_penalty
    };
  } else {
    // 標準模型：支援所有參數
    return {
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      max_tokens: agentConfig.maxTokens,
      top_p: agentConfig.topP || 0.95,
      presence_penalty: agentConfig.presencePenalty || 0,
      frequency_penalty: agentConfig.frequencyPenalty || 0,
    };
  }
}

/**
 * 設置JSON輸出格式
 * @returns JSON格式配置
 */
export function withJsonOutput(schema?: object) {
  if (schema) {
    return {
      response_format: {
        type: "json_schema",
        schema
      }
    };
  }
  
  return {
    response_format: { type: "json_object" }
  };
}

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
  const onRetry = options.onRetry ?? ((error, count) => console.warn(`重試 #${count}，錯誤:`, error.message));
  const retryCondition = options.retryCondition ?? (() => true);
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 判斷是否符合重試條件
      if (attempt < maxRetries && retryCondition(error)) {
        // 通知重試回調
        if (error instanceof Error) {
          onRetry(error, attempt + 1);
        } else {
          onRetry(new Error(String(error)), attempt + 1);
        }
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      } else {
        break;
      }
    }
  }
  
  // 所有重試失敗後拋出最後的錯誤
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(String(lastError));
}

/**
 * 異常回退機制 - 在AI處理失敗時提供安全的回退選項
 * @param fallbackValue 回退值
 * @param operation 要嘗試的操作
 * @returns 操作結果或回退值
 */
export async function withFallback<T>(fallbackValue: T, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('操作失敗，使用回退值:', error);
    return fallbackValue;
  }
}

/**
 * 測量AI操作性能
 * @param operation 要測量的操作
 * @returns 結果和性能數據
 */
export async function measurePerformance<T>(operation: () => Promise<T>): Promise<{
  result: T;
  metrics: {
    durationMs: number;
    timestamp: string;
  }
}> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const endTime = Date.now();
    
    return {
      result,
      metrics: {
        durationMs: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    const endTime = Date.now();
    console.error(`操作失敗，耗時: ${endTime - startTime}ms`);
    throw error;
  }
} 

/**
 * 獲取 Agent 配置
 * @param agentName Agent 名稱
 * @returns Agent 配置
 */
export async function getAgentConfig(agentName: string): Promise<AgentConfig> {
  try {
    // 從 R2 獲取 Agent 配置
    const config = await getJsonFromR2(`config/agents/${agentName}.json`);
    console.log(`✅ 成功載入 ${agentName} 配置`);
    return config as AgentConfig;
  } catch (error) {
    console.warn(`⚠️  無法載入 ${agentName} 配置，使用預設值:`, error);
    
    // 如果無法獲取配置，返回預設配置
    const defaultConfigs: Record<string, AgentConfig> = {
      contentAgent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 16000,
        systemPrompt: '你是一個 30 年經驗的彭博社資深編輯，擅長任何形式的正規專業新聞稿處理。',
        userPrompt: '請處理以下來源內容：\n\n${markdownContent}'
      },
      prWriterAgent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.4,
        maxTokens: 16000,
        systemPrompt: '你是一位擁有15年經驗的PR新聞稿專家，專門將普通內容轉換為專業的新聞稿。',
        userPrompt: '請處理以下來源內容：\n\n${markdownContent}'
      },
      copyEditorAgent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 16000,
        systemPrompt: '你是一位專業的內容分析師和WordPress參數生成專家，負責分析網站文章並生成適合發布的參數和內容。',
        userPrompt: '請分析以下內容並生成WordPress發布參數：\n\n${content}'
      }
    };
    
    return defaultConfigs[agentName] || {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 16000,
      systemPrompt: '你是一個專業的AI助手。',
      userPrompt: '請處理以下內容：\n\n${content}'
    };
  }
}

/**
 * 通用 AI API 調用函數
 * @param agentConfig Agent配置
 * @param systemPrompt 系統提示詞
 * @param userPrompt 用戶提示詞
 * @returns AI回應內容
 */
export async function callAIAPI(
  agentConfig: AgentConfig, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  const providerType = getProviderType(agentConfig.provider);
  
  switch (providerType) {
    case 'google':
      return await callGeminiAPI(agentConfig, systemPrompt, userPrompt);
      
    case 'openai':
    default:
      // 這裡需要導入 OpenAI 客戶端，但為了避免循環依賴，
      // 我們讓調用者處理 OpenAI 的情況
      throw new Error('OpenAI API 調用需要在 Agent 中處理');
  }
}

/**
 * 記錄模型使用信息
 * @param agentName Agent 名稱
 * @param config Agent 配置
 * @param action 執行的動作
 */
export function logModelUsage(agentName: string, config: AgentConfig, action: string) {
  console.log(`🤖 [${agentName}] ${action}`);
  console.log(`📡 提供商: ${config.provider || 'openai'}`);
  console.log(`🧠 模型: ${config.model || 'gpt-4o'}`);
  console.log(`🌡️  溫度: ${config.temperature || 0.3}`);
  console.log(`📝 最大Token: ${config.maxTokens || 16000}`);
  
  const otherParams: Record<string, number | string> = {};
  
  // 根據提供商類型顯示不同的參數
  const providerType = getProviderType(config.provider);
  if (providerType === 'google') {
    if (config.topP !== undefined) otherParams.topP = config.topP;
    // Gemini 不支援 presence_penalty 和 frequency_penalty
  } else {
    // OpenAI 參數
    if (config.topP !== undefined) otherParams.top_p = config.topP;
    if (config.presencePenalty !== undefined) otherParams.presence_penalty = config.presencePenalty;
    if (config.frequencyPenalty !== undefined) otherParams.frequency_penalty = config.frequencyPenalty;
  }
  
  if (Object.keys(otherParams).length > 0) {
    console.log(`⚙️  其他參數: ${JSON.stringify(otherParams)}`);
  }
}

/**
 * 替換用戶 Prompt 模板中的變數
 * @param template 模板字符串
 * @param variables 變數對象
 * @returns 替換後的字符串
 */
export function replacePromptVariables(template: string, variables: Record<string, string>): string {
  // 檢查 template 是否為有效字符串
  if (!template || typeof template !== 'string') {
    console.error('❌ 無效的 template:', template);
    throw new Error('Prompt 模板無效或缺失');
  }
  
  let result = template;
  
  // 替換所有 ${variableName} 格式的變數
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });
  
  return result;
} 