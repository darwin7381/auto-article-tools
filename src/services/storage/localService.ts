import fs from 'fs';
import path from 'path';

/**
 * 本地存儲服務 - 處理文件在本地的保存與讀取
 */

/**
 * 將內容保存到本地存儲
 * @param content 要保存的內容
 * @param fileName 文件名
 * @param dirName 公開目錄名（相對於public目錄）
 * @returns 公開訪問路徑
 */
export function saveToLocalStorage(content: string, fileName: string, dirName = 'processed-markdown'): string {
  // 創建目錄（如果不存在）
  const dirPath = path.join(process.cwd(), 'public', dirName);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // 寫入文件
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  // 返回公開訪問路徑
  return `/${dirName}/${fileName}`;
}

/**
 * 從本地讀取文件內容
 * @param fileName 文件名
 * @param dirName 公開目錄名（相對於public目錄）
 * @returns 文件內容
 */
export function readFromLocalStorage(fileName: string, dirName = 'processed-markdown'): string {
  const filePath = path.join(process.cwd(), 'public', dirName, fileName);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 創建臨時目錄
 * @param dirname 目錄名
 * @returns 創建的臨時目錄路徑
 */
export function createTempDirectory(dirname = 'temp'): string {
  const tempDir = path.join(process.cwd(), dirname);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
}

/**
 * 刪除本地文件
 * @param filePath 文件路徑
 */
export function deleteLocalFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
} 