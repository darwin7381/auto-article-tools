/**
 * WordPress媒體上傳測試腳本
 * 
 * 用法:
 * 1. 複製.env.example為.env.local並設置WordPress API憑證
 * 2. 運行 ts-node src/test-wp-media-upload.ts <image_url>
 */

import { uploadMediaFromUrl, WordPressCredentials } from './services/wordpress/wordpressService';
import * as dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ path: '.env.local' });

// 從環境變數中獲取WordPress API憑證
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';
const WP_API_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';

// 檢查環境變數是否已設置
if (!WP_API_BASE || !WP_API_USER || !WP_API_PASSWORD) {
  console.error('請設置WordPress API憑證環境變數。');
  console.error('需要設置: NEXT_PUBLIC_WORDPRESS_API_URL, WORDPRESS_API_USER, WORDPRESS_API_PASSWORD');
  process.exit(1);
}

// 從命令行參數獲取圖片URL
const imageUrl = process.argv[2];

if (!imageUrl) {
  console.error('請提供圖片URL作為參數');
  console.error('用法: ts-node src/test-wp-media-upload.ts <image_url>');
  process.exit(1);
}

// 建立WordPress憑證
const credentials: WordPressCredentials = {
  username: WP_API_USER,
  password: WP_API_PASSWORD
};

// 主函數
async function main() {
  console.log('WordPress媒體上傳測試');
  console.log(`API基本URL: ${WP_API_BASE}`);
  console.log(`用戶名: ${credentials.username}`);
  console.log(`圖片URL: ${imageUrl}`);
  
  try {
    console.log('開始上傳...');
    const result = await uploadMediaFromUrl(credentials, imageUrl);
    
    if (result.success) {
      console.log('\n✅ 上傳成功!');
      console.log(`媒體ID: ${result.id}`);
      console.log('\n使用此ID作為特色圖片 (featured_media) 的值。');
    } else {
      console.error('\n❌ 上傳失敗!');
      console.error(`錯誤: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ 上傳過程中發生錯誤:');
    console.error(error);
  }
}

// 執行主函數
main().catch(console.error); 