/**
 * TinyPNG 圖片壓縮測試腳本
 * 
 * 用法:
 * 1. 在環境變數中設置 TINYPNG_API_KEY
 * 2. 運行 npx ts-node src/test-tinypng-compression.ts <image_url>
 */

import { compressBlobWithTinyPng, shouldCompressImage } from './services/compression/tinyPngService';
import * as dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ path: '.env.local' });

// 從環境變數中獲取 TinyPNG API Key
const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY || '';

// 檢查環境變數是否已設置
if (!TINYPNG_API_KEY) {
  console.error('請設置 TINYPNG_API_KEY 環境變數。');
  console.error('您可以從 https://tinypng.com/developers 獲取免費的 API Key');
  process.exit(1);
}

// 從命令行參數獲取圖片URL
const imageUrl = process.argv[2];

if (!imageUrl) {
  console.error('請提供圖片URL作為參數');
  console.error('用法: npx ts-node src/test-tinypng-compression.ts <image_url>');
  process.exit(1);
}

// 主函數
async function main() {
  console.log('TinyPNG 圖片壓縮測試');
  console.log(`圖片URL: ${imageUrl}`);
  console.log(`API Key: ${TINYPNG_API_KEY.substring(0, 8)}...`);
  
  try {
    console.log('\n1. 正在下載圖片...');
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`下載圖片失敗: ${response.status} ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    console.log(`原始圖片大小: ${(imageBlob.size / 1024).toFixed(2)} KB`);
    console.log(`圖片類型: ${imageBlob.type}`);
    
    console.log('\n2. 檢查是否需要壓縮...');
    if (shouldCompressImage(imageBlob.size)) {
      console.log('✅ 圖片大小超過 250KB，需要壓縮');
    } else {
      console.log('ℹ️  圖片大小未超過 250KB，但仍可測試壓縮功能');
    }
    
    console.log('\n3. 開始多次壓縮圖片...');
    console.log('目標大小: 250KB，最多壓縮3次');
    const compressedBlob = await compressBlobWithTinyPng(imageBlob, TINYPNG_API_KEY, 250);
    
    console.log('\n✅ 壓縮完成!');
    console.log(`原始大小: ${(imageBlob.size / 1024).toFixed(2)} KB`);
    console.log(`壓縮後大小: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
    console.log(`壓縮比例: ${((1 - compressedBlob.size / imageBlob.size) * 100).toFixed(1)}%`);
    console.log(`節省空間: ${((imageBlob.size - compressedBlob.size) / 1024).toFixed(2)} KB`);
    
    if (compressedBlob.size / 1024 <= 250) {
      console.log(`🎯 成功達到目標大小！`);
    } else {
      console.log(`⚠️  未達到目標大小，但已達到最佳壓縮效果`);
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:');
    console.error(error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.error('\n💡 提示: 請檢查您的 TinyPNG API Key 是否正確');
    } else if (error instanceof Error && error.message.includes('429')) {
      console.error('\n💡 提示: API 配額已用完，請等待下個月或升級您的 TinyPNG 帳戶');
    }
  }
}

main(); 