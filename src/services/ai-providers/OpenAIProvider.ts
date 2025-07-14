/**
 * OpenAI 提供商實現
 */

import OpenAI from 'openai';
import { AIProviderBase, ChatMessage, ChatResponse, ChatParameters, ImageGenerationRequest, ImageGenerationResponse } from './base/AIProviderBase';
import { AIProvider } from '@/types/ai-config';
import { SUPPORTED_MODELS } from '@/types/ai-config';

export class OpenAIProvider extends AIProviderBase {
  readonly name: AIProvider = 'openai';
  readonly supportedModels = SUPPORTED_MODELS.openai.text;
  
  private client: OpenAI | null = null;
  
  constructor() {
    super();
    this.initializeClient();
  }
  
  private initializeClient(): void {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key 未設置');
        return;
      }
      
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      this.initialized = true;
      console.log('OpenAI 客戶端初始化成功');
    } catch (error) {
      console.error('OpenAI 客戶端初始化失敗:', error);
      this.initialized = false;
    }
  }
  
  async generateText(messages: ChatMessage[], parameters: ChatParameters): Promise<ChatResponse> {
    if (!this.initialized || !this.client) {
      throw new Error('OpenAI 客戶端未初始化');
    }
    
    // 驗證參數
    this.validateParameters(parameters);
    this.validateMessages(messages);
    
    try {
      const completion = await this.client.chat.completions.create({
        model: parameters.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: parameters.temperature,
        max_tokens: parameters.maxTokens,
        top_p: parameters.topP,
        frequency_penalty: parameters.frequencyPenalty || 0,
        presence_penalty: parameters.presencePenalty || 0,
      });
      
      const choice = completion.choices[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('OpenAI 返回無效的回應');
      }
      
      return {
        content: choice.message.content,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      throw this.handleError(error, '文本生成');
    }
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.initialized || !this.client) {
      throw new Error('OpenAI 客戶端未初始化');
    }
    
    // 驗證圖像模型
    if (!SUPPORTED_MODELS.openai.image.includes(request.model as 'gpt-image-1' | 'dall-e-3' | 'dall-e-2')) {
      throw new Error(`不支援的圖像模型: ${request.model}`);
    }
    
    try {
      const response = await this.client.images.generate({
        model: request.model as 'gpt-image-1' | 'dall-e-3' | 'dall-e-2',
        prompt: request.prompt,
        size: request.size as '1024x1024' | '1536x1024' | '1024x1536',
        quality: request.quality as 'standard' | 'hd',
        n: 1,
        response_format: 'b64_json'
      });
      
      if (!response.data || response.data.length === 0) {
        throw new Error('OpenAI 返回空的圖片數據');
      }
      
      const imageData = response.data[0];
      if (!imageData || !imageData.b64_json) {
        throw new Error('OpenAI 返回無效的圖片數據');
      }
      
      return {
        imageB64: imageData.b64_json
      };
    } catch (error) {
      throw this.handleError(error, '圖片生成');
    }
  }
  
  // 檢查模型是否支援（覆蓋基類方法以支援圖片模型）
  isModelSupported(model: string): boolean {
    return (SUPPORTED_MODELS.openai.text as readonly string[]).includes(model) || 
           (SUPPORTED_MODELS.openai.image as readonly string[]).includes(model);
  }
  
  // 獲取客戶端實例（用於直接調用）
  getClient(): OpenAI | null {
    return this.client;
  }
  
  // 重新初始化客戶端
  reinitialize(): void {
    this.client = null;
    this.initialized = false;
    this.initializeClient();
  }
} 