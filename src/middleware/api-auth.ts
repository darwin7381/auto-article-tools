import { auth } from '@clerk/nextjs/server';

/**
 * API 請求認證中間件
 * 同時支持 Clerk 會話認證和 API Key 認證
 * 
 * @param req 請求對象
 * @returns 未授權時返回 401 響應，授權成功返回 null
 */
export async function apiAuth(req: Request) {
  // 方法1: 檢查 API Key (用於服務器間通信)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey === process.env.API_SECRET_KEY) {
    console.log('[API Auth] 通過 API Key 認證成功');
    return null; // API Key 有效，允許請求
  }
  
  // 方法2: 檢查用戶會話 (用於前端用戶請求)
  try {
    const { userId } = await auth();
    if (userId) {
      console.log(`[API Auth] 通過會話認證成功: 用戶 ${userId}`);
      return null; // 用戶已登入，允許請求
    }
  } catch (error) {
    console.error('[API Auth] 會話檢查失敗:', error);
    // 會話檢查失敗，繼續處理
  }
  
  // 所有認證方式都失敗，返回 401 未授權
  console.log('[API Auth] 認證失敗: 無效的 API Key 或未登入');
  return new Response(JSON.stringify({ 
    error: '未授權訪問',
    message: '需要有效的用戶會話或 API Key'
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
} 