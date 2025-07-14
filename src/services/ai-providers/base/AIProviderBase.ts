/**
 * AI 提供商抽象層
 * 定義統一的 AI 調用介面
 */

import { AIProvider } from '@/types/ai-config';

// 聊天消息類型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 聊天回應類型
export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 圖片生成請求類型
export interface ImageGenerationRequest {
  prompt: string;
  size: string;
  quality: string;
  model: string;
}

// 圖片生成回應類型
export interface ImageGenerationResponse {
  imageUrl?: string;
  imageB64?: string;
  error?: string;
}

// 聊天參數類型
export interface ChatParameters {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI 提供商抽象介面
export interface IAIProvider {
  readonly name: AIProvider;
  readonly supportedModels: readonly string[];
  
  // 文本生成
  generateText(messages: ChatMessage[], parameters: ChatParameters): Promise<ChatResponse>;
  
  // 圖片生成（可選）
  generateImage?(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  
  // 驗證模型是否支援
  isModelSupported(model: string): boolean;
  
  // 初始化檢查
  isInitialized(): boolean;
}

// 抽象基類
export abstract class AIProviderBase implements IAIProvider {
  abstract readonly name: AIProvider;
  abstract readonly supportedModels: readonly string[];
  
  protected initialized = false;
  
  abstract generateText(messages: ChatMessage[], parameters: ChatParameters): Promise<ChatResponse>;
  
  // 預設的圖片生成實現（拋出未實現錯誤）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateImage(_request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return Promise.resolve({
      error: `${this.name} 不支援圖片生成功能`
    });
  }
  
  // 檢查模型是否支援
  isModelSupported(model: string): boolean {
    return this.supportedModels.includes(model);
  }
  
  // 檢查是否已初始化
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // 通用錯誤處理
  protected handleError(error: unknown, context: string): Error {
    console.error(`${this.name} ${context} 錯誤:`, error);
    
    if (error instanceof Error) {
      return new Error(`${this.name} ${context}: ${error.message}`);
    }
    
    return new Error(`${this.name} ${context}: 未知錯誤`);
  }
  
  // 驗證必要參數
  protected validateParameters(parameters: ChatParameters): void {
    if (!parameters.model) {
      throw new Error('缺少必要參數: model');
    }
    
    if (!this.isModelSupported(parameters.model)) {
      throw new Error(`不支援的模型: ${parameters.model}`);
    }
    
    if (parameters.temperature < 0 || parameters.temperature > 2) {
      throw new Error('temperature 參數必須在 0-2 之間');
    }
    
    if (parameters.topP < 0 || parameters.topP > 1) {
      throw new Error('topP 參數必須在 0-1 之間');
    }
    
    if (parameters.maxTokens < 1 || parameters.maxTokens > 100000) {
      throw new Error('maxTokens 參數必須在 1-100000 之間');
    }
  }
  
  // 驗證聊天消息
  protected validateMessages(messages: ChatMessage[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('聊天消息不能為空');
    }
    
    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('聊天消息必須包含 role 和 content');
      }
      
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error(`無效的消息角色: ${message.role}`);
      }
    }
  }
} 