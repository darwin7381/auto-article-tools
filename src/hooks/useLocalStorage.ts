'use client';

/**
 * 封裝localStorage操作的Hook
 * 提供存儲、獲取、移除等基本功能
 */
export function useLocalStorage() {
  /**
   * 保存數據到localStorage
   * @param key 存儲的鍵名
   * @param value 要存儲的值
   */
  const setItem = (key: string, value: unknown): void => {
    try {
      if (typeof window === 'undefined') return;
      
      // 如果是對象類型，轉換為字符串
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('保存數據到localStorage失敗:', error);
    }
  };

  /**
   * 從localStorage獲取數據
   * @param key 存儲的鍵名
   * @param parseJson 是否需要解析JSON，默認為false
   * @returns 存儲的值或null
   */
  const getItem = <T = string>(key: string, parseJson: boolean = false): T | string | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const value = window.localStorage.getItem(key);
      if (value === null) return null;
      
      // 如果需要解析JSON，嘗試解析
      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value;
        }
      }
      
      return value;
    } catch (error) {
      console.error('從localStorage獲取數據失敗:', error);
      return null;
    }
  };

  /**
   * 從localStorage移除數據
   * @param key 存儲的鍵名
   */
  const removeItem = (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('從localStorage移除數據失敗:', error);
    }
  };

  /**
   * 清除所有localStorage數據
   */
  const clear = (): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.clear();
    } catch (error) {
      console.error('清除localStorage失敗:', error);
    }
  };

  return {
    setItem,
    getItem,
    removeItem,
    clear
  };
} 