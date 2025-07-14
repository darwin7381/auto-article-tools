/**
 * 上傳修正後的正確配置到R2
 * 修正：
 * 1. 圖像模型：gpt-image-1 → dall-e-3
 * 2. 圖像品質：medium → standard
 * 3. 確保所有API格式正確
 */

import AWS from 'aws-sdk';

// R2配置
const s3 = new AWS.S3({
  endpoint: 'https://b1d3f8b35c1b43afe837b997180714f3.r2.cloudflarestorage.com',
  accessKeyId: '9ef3da70583e2a2c9f68d14bba138130',
  secretAccessKey: '3fd97a537e7291148e0a3accd5a93af7fadb034e7e4edb20be76775597c482ef',
  region: 'auto',
  signatureVersion: 'v4',
});

const bucketName = 'blocktempo-ai';

// 正確的Agent配置
const CORRECTED_AGENT_CONFIGS = {
  contentAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一個 30 年經驗的彭博社資深編輯，擅長任何形式的正規專業新聞稿處理。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 若是內容處理涉及翻譯，請確實考量實際語意表達，以免有些詞或標題在翻譯後失去語境含義
3. 進行內容初步處理、整理，使其成為專業的 PR 新聞稿
4. 但需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格...格式和位置相符等
5. 不要遺漏任何重要資訊，或過度簡化格式，仍須遵正客戶所給的原始內容格式和佈局，僅有大錯誤或大問題時，才進行修正
6. 輸出必須保持正確的 Markdown 格式，維持標題層級、段落和列表的格式
7. 不同段落之間不要自己亂加一大堆奇怪的分隔線，未來我們是會轉換成 html 的，所以不要自己亂加分隔線「---」以免未來造成格式隱患`,
    userPrompt: `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿，但必須尊重原始內容，不要遺漏任何重要資訊或錯誤簡化格式或過度進行改寫：

\${markdownContent}`
  },
  prWriterAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一位擁有15年經驗的PR新聞稿專家，專門將普通內容轉換為專業的新聞稿。你的任務是：

1. 基於已經處理過的台灣繁體中文內容，進一步優化為專業PR新聞稿格式
2. 確保文章具有新聞價值，標題吸引人且精確
3. 結構化內容，包含導言、主體、背景信息和結論
4. 加強引用和數據的可信度
5. 優化語言表達，使其更具新聞專業性
6. 保持原始內容的完整性和準確性
7. 輸出格式必須是正確的 Markdown`,
    userPrompt: `請將以下已處理的內容進一步優化為專業的PR新聞稿：

\${markdownContent}`
  },
  copyEditorAgent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 16000,
    topP: 0.95,
    systemPrompt: `你是一位專業的數位內容編輯，負責生成WordPress發布參數。你的任務是：

1. 分析文章內容，生成適當的分類和標籤
2. 創建SEO友好的摘要
3. 生成吸引人的社群媒體描述
4. 確保所有參數符合WordPress標準
5. 保持內容的專業性和一致性`,
    userPrompt: `請基於以下文章內容生成WordPress發布參數：

\${htmlContent}`
  },
  imageGeneration: {
    provider: 'openai',
    model: 'dall-e-3',
    size: '1536x1024',
    quality: 'standard',
    promptTemplate: `Create a professional, clean cover image for a technology/business news article. The image should be suitable for a news publication and include subtle visual elements related to: \${title}. 

Key requirements:
- Modern, professional design aesthetic
- Suitable for business/technology news
- Clean composition with subtle branding potential
- No text overlays (text will be added separately)
- Colors that work well with news layouts
- High contrast and clear visual hierarchy

Content context: \${contentSummary}
Article type: \${articleType}`
  }
};

// 上傳函數
async function uploadConfig(agentName, config) {
  const key = `config/agents/${agentName}.json`;
  
  try {
    const result = await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(config, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    }).promise();
    
    console.log(`✅ ${agentName}: ${result.Location}`);
    return result;
  } catch (error) {
    console.error(`❌ ${agentName} 上傳失敗:`, error);
    throw error;
  }
}

// 主要執行函數
async function main() {
  console.log('🚀 開始上傳修正後的正確配置...\n');
  
  try {
    // 上傳所有Agent配置
    for (const [agentName, config] of Object.entries(CORRECTED_AGENT_CONFIGS)) {
      await uploadConfig(agentName, config);
    }
    
    // 上傳元數據
    const metadata = {
      lastUpdated: new Date().toISOString(),
      version: '2.1.0',
      description: 'API格式修正版：dall-e-3模型、標準品質、正確參數',
      agents: Object.keys(CORRECTED_AGENT_CONFIGS)
    };
    
    await s3.upload({
      Bucket: bucketName,
      Key: 'config/agents/metadata.json',
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    }).promise();
    
    console.log('\n🎉 所有修正配置上傳完成！');
    console.log('📍 重要修正：');
    console.log('   • 圖像模型：gpt-image-1 → dall-e-3');
    console.log('   • 圖像品質：medium → standard');
    console.log('   • API格式已符合OpenAI官方規範');
    
  } catch (error) {
    console.error('❌ 上傳過程中發生錯誤:', error);
    process.exit(1);
  }
}

main();
