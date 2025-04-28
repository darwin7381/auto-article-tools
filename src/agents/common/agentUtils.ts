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
  requireStructuredOutput?: boolean;
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
  
  // 添加結構化輸出要求
  if (options?.requireStructuredOutput) {
    prompt += '\n\n請以JSON格式回應，具有以下結構:\n```json\n{\n  "result": "處理結果",\n  "metadata": {\n    // 其他相關信息\n  }\n}\n```';
  }
  
  return prompt;
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