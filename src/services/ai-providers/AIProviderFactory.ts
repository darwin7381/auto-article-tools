/**
 * AI 提供商工廠
 * 根據配置創建對應的 AI 提供商實例
 */

import { AIProvider } from '@/types/ai-config';
import { IAIProvider } from './base/AIProviderBase';
import { OpenAIProvider } from './OpenAIProvider';

// 提供商實例緩存
const providerCache = new Map<AIProvider, IAIProvider>();

/**
 * 創建 AI 提供商實例
 * @param provider 提供商類型
 * @returns AI 提供商實例
 */
export function createAIProvider(provider: AIProvider): IAIProvider {
  // 從緩存中獲取現有實例
  const cachedProvider = providerCache.get(provider);
  if (cachedProvider && cachedProvider.isInitialized()) {
    return cachedProvider;
  }
  
  // 創建新的提供商實例
  let providerInstance: IAIProvider;
  
  switch (provider) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    
    case 'gemini':
      // TODO: 實現 Gemini 提供商
      throw new Error('Gemini 提供商尚未實現');
    
    case 'grok':
      // TODO: 實現 Grok 提供商
      throw new Error('Grok 提供商尚未實現');
    
    case 'claude':
      // TODO: 實現 Claude 提供商
      throw new Error('Claude 提供商尚未實現');
    
    default:
      throw new Error(`不支援的 AI 提供商: ${provider}`);
  }
  
  // 將新實例放入緩存
  providerCache.set(provider, providerInstance);
  
  return providerInstance;
}

/**
 * 獲取所有已初始化的提供商
 * @returns 提供商列表
 */
export function getInitializedProviders(): Array<{ name: AIProvider; instance: IAIProvider }> {
  const providers: Array<{ name: AIProvider; instance: IAIProvider }> = [];
  
  for (const [name, instance] of providerCache) {
    if (instance.isInitialized()) {
      providers.push({ name, instance });
    }
  }
  
  return providers;
}

/**
 * 清理提供商緩存
 * @param provider 可選的特定提供商，如果不指定則清理所有
 */
export function clearProviderCache(provider?: AIProvider): void {
  if (provider) {
    providerCache.delete(provider);
    console.log(`已清理 ${provider} 提供商緩存`);
  } else {
    providerCache.clear();
    console.log('已清理所有提供商緩存');
  }
}

/**
 * 檢查提供商是否可用
 * @param provider 提供商類型
 * @returns 是否可用
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  try {
    const instance = createAIProvider(provider);
    return instance.isInitialized();
  } catch (error) {
    console.warn(`提供商 ${provider} 不可用:`, error);
    return false;
  }
}

/**
 * 獲取支援的提供商列表
 * @returns 支援的提供商列表
 */
export function getSupportedProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  
  // 檢查每個提供商是否可用
  const allProviders: AIProvider[] = ['openai', 'gemini', 'grok', 'claude'];
  
  for (const provider of allProviders) {
    if (isProviderAvailable(provider)) {
      providers.push(provider);
    }
  }
  
  return providers;
}

/**
 * 獲取提供商的支援模型
 * @param provider 提供商類型
 * @returns 支援的模型列表
 */
export function getProviderModels(provider: AIProvider): readonly string[] {
  try {
    const instance = createAIProvider(provider);
    return instance.supportedModels;
  } catch (error) {
    console.warn(`獲取 ${provider} 支援模型失敗:`, error);
    return [];
  }
}

/**
 * 驗證提供商和模型組合是否有效
 * @param provider 提供商類型
 * @param model 模型名稱
 * @returns 是否有效
 */
export function validateProviderModel(provider: AIProvider, model: string): boolean {
  try {
    const instance = createAIProvider(provider);
    return instance.isModelSupported(model);
  } catch (error) {
    console.warn(`驗證 ${provider}/${model} 組合失敗:`, error);
    return false;
  }
} 