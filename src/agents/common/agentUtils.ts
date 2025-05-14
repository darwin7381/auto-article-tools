/**
 * Agent 工具函數集合
 * 提供與AI Agent相關的公共工具和幫助函數
 */

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