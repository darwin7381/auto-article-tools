/**
 * 本地存儲服務 - 客戶端版本（僅處理瀏覽器本地存儲）
 */

/**
 * 將內容保存到本地存儲（向後兼容API，實際上不做任何操作）
 * @param content 要保存的內容
 * @param fileName 文件名
 * @returns 公開訪問路徑
 */
export function saveToLocalStorage(content: string, fileName: string): string {
  // 不再使用本地存儲，僅依賴R2
  // 返回空字符串，讓系統使用publicUrl
  console.log(`不再保存到本地存儲，fileName: ${fileName}`);
  return '';
}

/**
 * 將編輯器內容保存到瀏覽器的 localStorage
 * @param content 編輯器內容 (HTML 格式)
 * @param fileId 文件ID
 * @returns 是否保存成功
 */
export function saveEditorContent(content: string, fileId: string): boolean {
  try {
    // 確保僅在瀏覽器環境中執行
    if (typeof window !== 'undefined') {
      // 儲存內容到 localStorage，使用前綴避免衝突
      const key = `editor_content_${fileId}`;
      localStorage.setItem(key, content);
      console.log(`編輯器內容已保存到 localStorage，key: ${key}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存編輯器內容到 localStorage 失敗:', error);
    return false;
  }
}

/**
 * 從 localStorage 獲取編輯器內容
 * @param fileId 文件ID
 * @returns 編輯器內容或null（如果不存在）
 */
export function getEditorContent(fileId: string): string | null {
  try {
    // 確保僅在瀏覽器環境中執行
    if (typeof window !== 'undefined') {
      const key = `editor_content_${fileId}`;
      return localStorage.getItem(key);
    }
    return null;
  } catch (error) {
    console.error('從 localStorage 獲取編輯器內容失敗:', error);
    return null;
  }
} 