// 測試WordPress API連接和發布功能
import { config } from 'dotenv';
config({ path: '.env.local' });

interface WordPressUser {
  name: string;
  id: number;
  [key: string]: unknown;
}

interface WordPressPost {
  id: number;
  status: string;
  link: string;
  [key: string]: unknown;
}

const testWordPressPost = async (): Promise<void> => {
  const WP_API_BASE = process.env.WORDPRESS_API_URL || '';
  const WP_API_USER = process.env.WORDPRESS_API_USER || '';
  const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';
  
  console.log('WordPress API設定：');
  console.log(`API基地址: ${WP_API_BASE ? '已設定' : '未設定'}`);
  console.log(`API用戶名: ${WP_API_USER ? '已設定' : '未設定'}`);
  console.log(`API密碼: ${WP_API_PASSWORD ? '已設定' : '未設定'}`);
  
  if (!WP_API_BASE || !WP_API_USER || !WP_API_PASSWORD) {
    console.error('錯誤：WordPress API設定不完整，請檢查.env.local文件');
    return;
  }
  
  // 基本授權標頭
  const authHeader = 'Basic ' + Buffer.from(`${WP_API_USER}:${WP_API_PASSWORD}`).toString('base64');
  
  try {
    console.log('測試WordPress API連接...');
    
    // 首先測試用戶認證
    const userResponse = await fetch(`${WP_API_BASE}/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!userResponse.ok) {
      console.error(`認證失敗: ${userResponse.status} ${userResponse.statusText}`);
      const errorText = await userResponse.text();
      console.error(errorText);
      return;
    }
    
    const userData = await userResponse.json() as WordPressUser;
    console.log(`認證成功！已連接為用戶: ${userData.name}`);
    
    // 發布測試文章
    console.log('嘗試發布測試文章...');
    const postResponse = await fetch(`${WP_API_BASE}/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        title: '測試文章 - 自動上稿工具',
        content: '<p>這是一篇測試文章，由自動上稿工具發布。時間戳記：' + new Date().toISOString() + '</p>',
        status: 'draft',
      })
    });
    
    if (!postResponse.ok) {
      console.error(`發布失敗: ${postResponse.status} ${postResponse.statusText}`);
      const errorData = await postResponse.json();
      console.error(JSON.stringify(errorData, null, 2));
      return;
    }
    
    const postData = await postResponse.json() as WordPressPost;
    console.log('測試文章發布成功！');
    console.log(`文章ID: ${postData.id}`);
    console.log(`文章狀態: ${postData.status}`);
    console.log(`文章連結: ${postData.link}`);
  } catch (error) {
    console.error('發生錯誤：', error instanceof Error ? error.message : String(error));
  }
};

testWordPressPost(); 