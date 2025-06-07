import { auth } from '@clerk/nextjs/server';

/**
 * API 請求認證中間件
 * 同時支持 Clerk 會話認證和 API Key 認證
 * 
 * @param req 請求對象
 * @returns 未授權時返回 401 響應，授權成功返回 null
 */
export async function apiAuth(req: Request) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('[API Auth] 開始認證檢查...');
    console.log('[API Auth] 請求 URL:', req.url);
  }
  
  // 方法1: 檢查 API Key (用於服務器間通信)
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.API_SECRET_KEY;
  
  if (isDevelopment) {
    console.log('[API Auth] 檢查 API Key...');
    console.log('[API Auth] API Key:', apiKey ? '存在' : '缺少');
    console.log('[API Auth] 環境配置:', expectedApiKey ? '已配置' : '未配置');
  }
  
  if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
    if (isDevelopment) {
      console.log('[API Auth] 通過 API Key 認證成功');
    }
    return null; // API Key 有效，允許請求
  }
  
  // 方法2: 檢查用戶會話 (用於前端用戶請求)
  if (isDevelopment) {
    console.log('[API Auth] API Key 認證失敗，檢查 Clerk 會話...');
  }
  
  try {
    const { userId } = await auth();
    if (userId) {
      if (isDevelopment) {
        console.log('[API Auth] 通過 Clerk 會話認證成功');
      }
      return null; // 用戶已登入，允許請求
    }
    if (isDevelopment) {
      console.log('[API Auth] Clerk 會話檢查：無用戶ID');
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('[API Auth] Clerk 會話檢查失敗:', error);
    }
    // 記錄錯誤但不暴露詳細信息給客戶端
  }
  
  // 所有認證方式都失敗，返回 401 未授權
  if (isDevelopment) {
    console.log('[API Auth] 認證失敗');
  }
  
  // 返回通用錯誤信息，不暴露具體認證方式
  return new Response(JSON.stringify({ 
    error: '未授權訪問',
    message: '請確保您已登錄並有權限訪問此資源'
  }), {
    status: 401,
    headers: { 
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer' // 標準認證頭
    }
  });
} 