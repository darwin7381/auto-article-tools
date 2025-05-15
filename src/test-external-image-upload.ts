/**
 * WordPress外部圖片URL導入測試腳本
 * 
 * 用法:
 * 1. 運行: node src/test-external-image-upload.js <image_url>
 * 
 * 這個腳本測試直接從外部URL導入圖片到WordPress媒體庫的功能，
 * 無需先下載圖片再上傳，而是WordPress直接從URL獲取圖片。
 */

import { uploadMediaFromUrl, WordPressCredentials } from './services/wordpress/wordpressService';
import * as dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ path: '.env.local' });

// 從環境變數中獲取WordPress API憑證
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';
const WP_API_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';

// 檢查必要參數
const imageUrl = process.argv[2];

if (!imageUrl) {
  console.error('請提供外部圖片URL作為參數');
  console.error('用法: node src/test-external-image-upload.js <image_url>');
  process.exit(1);
}

// 建立WordPress憑證
const credentials: WordPressCredentials = {
  username: WP_API_USER,
  password: WP_API_PASSWORD
};

// 主函數
async function main() {
  console.log('===== WordPress外部圖片URL導入測試 =====');
  console.log(`API基本URL: ${WP_API_BASE || '未設置(將使用命令行參數)'}`);
  console.log(`用戶名: ${credentials.username || '未設置(將使用命令行參數)'}`);
  console.log(`圖片URL: ${imageUrl}`);
  
  // 確認是否繼續
  console.log('\n即將測試從外部URL直接導入圖片並獲取媒體ID...');
  
  try {
    console.log('\n開始上傳...');
    
    // 開始計時
    const startTime = new Date();
    
    // 嘗試匿名上傳（如果沒有設置認證）
    let useAuth = !!(credentials.username && credentials.password);
    
    console.log(`使用認證信息: ${useAuth ? '是' : '否'}`);
    
    // 執行上傳
    const result = await uploadMediaFromUrl(
      useAuth ? credentials : { username: '', password: '' }, 
      imageUrl
    );
    
    // 計算耗時
    const endTime = new Date();
    const timeSpent = (endTime.getTime() - startTime.getTime()) / 1000;
    
    if (result.success) {
      console.log('\n✅ 上傳成功!');
      console.log(`媒體ID: ${result.id}`);
      console.log(`耗時: ${timeSpent.toFixed(2)}秒`);
      console.log('\n使用此ID作為特色圖片:');
      console.log(`featured_media: ${result.id}`);
    } else {
      console.error('\n❌ 上傳失敗!');
      console.error(`錯誤: ${result.error}`);
      console.error(`耗時: ${timeSpent.toFixed(2)}秒`);
      
      // 如果第一次使用認證失敗，嘗試匿名上傳
      if (useAuth) {
        console.log('\n嘗試匿名上傳...');
        const anonymousResult = await uploadMediaFromUrl(
          { username: '', password: '' }, 
          imageUrl
        );
        
        if (anonymousResult.success) {
          console.log('\n✅ 匿名上傳成功!');
          console.log(`媒體ID: ${anonymousResult.id}`);
          console.log('\n使用此ID作為特色圖片:');
          console.log(`featured_media: ${anonymousResult.id}`);
        } else {
          console.error('\n❌ 匿名上傳也失敗!');
          console.error(`錯誤: ${anonymousResult.error}`);
        }
      }
    }
  } catch (error) {
    console.error('\n❌ 上傳過程中發生錯誤:');
    console.error(error);
  }
}

// 執行主函數
main().catch(console.error); 