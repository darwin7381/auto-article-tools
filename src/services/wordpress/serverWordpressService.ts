/**
 * 服務器端WordPress服務
 * 這個文件包含只能在服務器端運行的WordPress相關函數
 */

import { compressBlobWithTinyPng, shouldCompressImage } from '@/services/compression/tinyPngService';

// 重用現有的類型定義
export interface WordPressCredentials {
  username: string;
  password: string;
}

// 創建WordPress API完整URL的通用函數
function createWpApiUrl(endpoint: string, baseUrl: string): string {
  // 確保API基本URL是完整的絕對URL
  if (!baseUrl || !baseUrl.startsWith('http')) {
    console.error('WordPress API基本URL無效:', baseUrl);
    throw new Error('WordPress API基本URL必須是完整的絕對URL (以http://或https://開頭)');
  }
  
  // 修正WordPress REST API路徑
  // WordPress REST API路徑應該是/wp-json/wp/v2/...而不是/wp/v2/...
  let apiPath = endpoint;
  if (endpoint.startsWith('/wp/v2/')) {
    apiPath = '/wp-json' + endpoint;
  } else if (endpoint.startsWith('/wp-json/wp/v2/')) {
    // 已經是完整路徑，不需調整
    apiPath = endpoint;
  } else if (!endpoint.startsWith('/wp-json/')) {
    apiPath = '/wp-json' + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }
  
  // 移除潛在的重複斜線
  while (apiPath.includes('//')) {
    apiPath = apiPath.replace('//', '/');
  }
  
  if (apiPath.startsWith('/')) {
    // 確保開頭只有一個斜線
    apiPath = '/' + apiPath.replace(/^\/+/, '');
  }
  
  // 構建完整URL
  // 移除API基本URL結尾的斜線(如果有)
  const baseUrlClean = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const fullUrl = `${baseUrlClean}${apiPath}`;
  
  return fullUrl;
}

/**
 * 從URL上傳媒體文件到WordPress - 服務器端版本
 * @param credentials WordPress認證信息
 * @param imageUrl 圖片URL
 * @param wpApiBase WordPress API基本URL
 * @returns 上傳後的媒體ID或錯誤信息
 */
export async function uploadMediaFromUrl(
  credentials: WordPressCredentials,
  imageUrl: string,
  wpApiBase: string
): Promise<{ 
  id: number; 
  success: boolean; 
  error?: string; 
  details?: unknown; 
}> {
  try {
    // 檢查認證信息
    if (!credentials.username || !credentials.password) {
      console.error("缺少WordPress認證信息");
      return {
        id: 0,
        success: false,
        error: "缺少WordPress認證信息"
      };
    }
    
    // 檢查URL格式
    let url;
    try {
      url = new URL(imageUrl);
      // 額外檢查協議
      if (!['http:', 'https:'].includes(url.protocol)) {
        console.error(`無效的URL協議: ${url.protocol}，必須使用http或https`);
        return { 
          id: 0, 
          success: false, 
          error: `無效的URL協議: ${url.protocol}，必須使用http或https` 
        };
      }
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.error('無效的圖片URL格式:', imageUrl);
      return { 
        id: 0, 
        success: false, 
        error: '無效的圖片URL格式' 
      };
    }
    
    // 檢查URL是否為圖片格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasValidExtension = imageExtensions.some(ext => 
      url.pathname.toLowerCase().endsWith(ext) || 
      url.pathname.toLowerCase().includes(ext + '?')
    );
    
    // 不是明確的圖片格式，進行額外警告
    if (!hasValidExtension) {
      console.warn(`URL不是明確的圖片格式，嘗試繼續: ${imageUrl}`);
    }
    
    // 從URL獲取圖片內容（添加超時設定）
    let imageResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時
      
      imageResponse = await fetch(imageUrl, { 
        headers: { 'Accept': 'image/*' },
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error(`獲取圖片失敗: ${errorMessage}`);
      return { 
        id: 0, 
        success: false, 
        error: `無法獲取圖片: ${errorMessage}` 
      };
    }
    
    if (!imageResponse.ok) {
      console.error(`獲取圖片返回非成功狀態: ${imageResponse.status} ${imageResponse.statusText}`);
      return { 
        id: 0, 
        success: false, 
        error: `獲取圖片失敗: HTTP ${imageResponse.status} ${imageResponse.statusText}` 
      };
    }
    
    // 檢查回應的Content-Type
    const responseContentType = imageResponse.headers.get('content-type');
    if (!responseContentType) {
      console.warn(`圖片URL未返回Content-Type，假設為image/jpeg`);
    } else if (!responseContentType.startsWith('image/')) {
      console.warn(`圖片URL返回了非圖片Content-Type: ${responseContentType}`);
    }
    
    // 獲取圖片內容和MIME類型
    let imageBlob;
    try {
      imageBlob = await imageResponse.blob();
    } catch (blobError) {
      const errorMessage = blobError instanceof Error ? blobError.message : String(blobError);
      console.error(`讀取圖片數據失敗: ${errorMessage}`);
      return { 
        id: 0, 
        success: false, 
        error: `無法讀取圖片數據: ${errorMessage}`
      };
    }
    
    if (imageBlob.size === 0) {
      console.error(`圖片數據為空: 大小=${imageBlob.size}字節`);
      return {
        id: 0,
        success: false,
        error: '獲取到空的圖片數據'
      };
    }
    
    console.log(`原始圖片大小: ${(imageBlob.size / 1024).toFixed(2)} KB`);
    
    // 檢查是否需要壓縮圖片
    let finalImageBlob = imageBlob;
    if (shouldCompressImage(imageBlob.size)) {
      console.log('圖片大小超過 250KB，開始使用 TinyPNG 壓縮...');
      
      // 從環境變數獲取 TinyPNG API Key
      const tinyPngApiKey = process.env.TINYPNG_API_KEY;
      
      if (tinyPngApiKey) {
        try {
          // 使用多次壓縮策略，目標大小200KB (留一些緩衝空間)
          finalImageBlob = await compressBlobWithTinyPng(imageBlob, tinyPngApiKey, 200);
          console.log(`圖片多次壓縮完成，最終大小: ${(finalImageBlob.size / 1024).toFixed(2)} KB`);
        } catch (compressionError) {
          console.warn('圖片壓縮失敗，使用原始圖片繼續上傳:', compressionError);
          // 壓縮失敗時繼續使用原始圖片，不阻止上傳流程
          finalImageBlob = imageBlob;
        }
      } else {
        console.warn('未設置 TINYPNG_API_KEY 環境變數，跳過圖片壓縮');
        finalImageBlob = imageBlob;
      }
    } else {
      console.log('圖片大小未超過 250KB，無需壓縮');
    }
    
    const contentType = responseContentType || 'image/jpeg';
    
    // 從URL中提取文件名
    const urlParts = imageUrl.split('/');
    let filename = urlParts[urlParts.length - 1];
    // 確保文件名中不含查詢參數
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }
    // 確保文件名不為空
    if (!filename || filename.trim() === '' || filename === '/') {
      filename = `image-${Date.now()}.jpg`;
    }
    
    // 🔧 修復Unicode字符編碼問題：安全處理文件名
    // 將Unicode字符替換為安全的ASCII字符，避免ByteString轉換錯誤
    let safeFilename = filename;
    try {
      // 使用正則表達式移除或替換非ASCII字符
      safeFilename = filename.replace(/[^\x00-\x7F]/g, ''); // 移除非ASCII字符
      
      // 如果移除後文件名為空或太短，生成一個安全的文件名
      if (safeFilename.length < 3) {
        const timestamp = Date.now();
        const extension = filename.includes('.') ? filename.split('.').pop() : 'jpg';
        safeFilename = `image-${timestamp}.${extension}`;
      }
      
      // 確保文件名不包含特殊字符
      safeFilename = safeFilename.replace(/[^a-zA-Z0-9.\-_]/g, '-');
      
      console.log(`文件名安全化處理: "${filename}" -> "${safeFilename}"`);
    } catch (filenameError) {
      console.error('處理文件名時發生錯誤:', filenameError);
      safeFilename = `image-${Date.now()}.jpg`;
    }
    
    // 創建WordPress媒體API URL
    const apiUrl = createWpApiUrl('/wp-json/wp/v2/media', wpApiBase);
    
    // 設置認證和其他頭信息
    const headers = new Headers();
    const authString = `${credentials.username}:${credentials.password}`;
    
    // 🔧 修復Unicode字符編碼問題：安全處理認證字符串
    let base64Auth;
    try {
      // 使用TextEncoder確保正確的UTF-8編碼，然後轉為base64
      const encoder = new TextEncoder();
      const authBytes = encoder.encode(authString);
      base64Auth = Buffer.from(authBytes).toString('base64');
    } catch (authError) {
      console.error('處理認證字符串時發生錯誤:', authError);
      // 回退到原始方法（可能會有編碼問題，但至少不會崩潰）
      base64Auth = Buffer.from(authString, 'utf8').toString('base64');
    }
    
    headers.append('Authorization', `Basic ${base64Auth}`);
    headers.append('Content-Disposition', `attachment; filename="${safeFilename}"`);
    headers.append('Content-Type', contentType);
    
    // 發送上傳請求（添加超時設定）
    let uploadResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 增加到120秒超時，圖片上傳可能很慢
      
      uploadResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: finalImageBlob,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      console.error(`上傳請求失敗: ${errorMessage}`);
      return {
        id: 0,
        success: false,
        error: `上傳請求失敗: ${errorMessage}`
      };
    }
    
    if (uploadResponse.ok) {
      try {
        const data = await uploadResponse.json();
        return { id: data.id, success: true };
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`解析成功響應失敗: ${errorMessage}`);
        return {
          id: 0,
          success: false,
          error: `無法解析成功響應: ${errorMessage}`
        };
      }
    } else {
      // 處理上傳失敗響應
      console.error(`WordPress媒體上傳失敗: 狀態=${uploadResponse.status} ${uploadResponse.statusText}`);
      
      let responseContent = null;
      
      try {
        const contentType = uploadResponse.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorData = await uploadResponse.json();
          responseContent = errorData;
          console.error("WordPress錯誤響應(JSON):", JSON.stringify(errorData, null, 2));
        } else {
          // 對於非JSON回應，獲取文本內容
          const text = await uploadResponse.text();
          responseContent = text;
          console.error("WordPress錯誤響應(文本):", {
            preview: text.substring(0, 200),
            length: text.length
          });
        }
      } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
        console.error("無法解析錯誤響應內容");
      }
      
      return { 
        id: 0, 
        success: false, 
        error: `上傳失敗: HTTP ${uploadResponse.status} ${uploadResponse.statusText}`,
        details: responseContent
      };
    }
  } catch (error) {
    console.error('從URL上傳媒體失敗:', error);
    return { 
      id: 0, 
      success: false, 
      error: `上傳過程中發生錯誤: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
} 