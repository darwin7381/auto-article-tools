const mammoth = require('mammoth');
const fs = require('fs');

async function debugDocxFile(filePath) {
  try {
    console.log('=== 開始調試 DOCX 文件 ===');
    console.log('文件路徑:', filePath);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return;
    }
    
    // 獲取文件大小
    const stats = fs.statSync(filePath);
    console.log('文件大小:', stats.size, 'bytes');
    
    // 讀取文件
    const buffer = fs.readFileSync(filePath);
    console.log('文件讀取成功，Buffer 大小:', buffer.length);
    
    // 檢查文件頭部（DOCX 文件應該以 PK 開頭）
    const header = buffer.slice(0, 10);
    console.log('文件頭部 (hex):', header.toString('hex'));
    console.log('文件頭部 (ascii):', header.toString('ascii'));
    
    // 嘗試使用 mammoth 轉換
    console.log('\n=== 開始 mammoth 轉換 ===');
    
    const result = await mammoth.convertToHtml({ buffer });
    
    console.log('轉換成功！');
    console.log('HTML 內容長度:', result.value.length);
    console.log('HTML 內容前 200 字符:', result.value.substring(0, 200));
    console.log('消息數量:', result.messages.length);
    
    if (result.messages.length > 0) {
      console.log('轉換消息:');
      result.messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.type}: ${msg.message}`);
      });
    }
    
  } catch (error) {
    console.error('=== 錯誤發生 ===');
    console.error('錯誤類型:', error.constructor.name);
    console.error('錯誤信息:', error.message);
    console.error('錯誤堆疊:', error.stack);
    
    // 檢查是否包含 "Request En" 字符串
    if (error.message.includes('Request En')) {
      console.error('!!! 發現 "Request En" 錯誤 !!!');
      console.error('完整錯誤信息:', error.message);
    }
  }
}

// 使用方法：node debug-docx.js [文件路徑]
const filePath = process.argv[2];
if (!filePath) {
  console.error('請提供 DOCX 文件路徑');
  console.error('使用方法: node debug-docx.js [文件路徑]');
  process.exit(1);
}

debugDocxFile(filePath);
