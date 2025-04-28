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
  // 在 Vercel 環境中使用 /tmp 目錄，該目錄在 Serverless 環境中通常是可寫的
  const dirPath = process.env.NODE_ENV === 'production' 
    ? path.join('/tmp', dirName)
    : path.join(process.cwd(), 'public', dirName);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // 寫入文件
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  // 返回訪問路徑
  // 在生產環境中這個路徑將不再是可直接訪問的URL，
  // 而是一個表示臨時文件位置的路徑標識
  return process.env.NODE_ENV === 'production'
    ? `/api/markdown-proxy/${fileName}` // 這需要創建一個API路由來代理訪問臨時文件
    : `/${dirName}/${fileName}`;
}

/**
 * 從本地讀取文件內容
 * @param fileName 文件名
 * @param dirName 目錄名
 * @returns 文件內容
 */
export function readFromLocalStorage(fileName: string, dirName = 'processed-markdown'): string {
  // 在 Vercel 環境中使用 /tmp 目錄
  const dirPath = process.env.NODE_ENV === 'production' 
    ? path.join('/tmp', dirName)
    : path.join(process.cwd(), 'public', dirName);
    
  const filePath = path.join(dirPath, fileName);
  
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
  // 在 Vercel 環境中使用 /tmp 目錄，該目錄在 Serverless 環境中通常是可寫的
  const tempDir = process.env.NODE_ENV === 'production' 
    ? path.join('/tmp', dirname)
    : path.join(process.cwd(), dirname);
  
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