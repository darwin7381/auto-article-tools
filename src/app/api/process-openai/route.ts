import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// 初始化OpenAI
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI客戶端初始化成功');
} catch (error) {
  console.error('OpenAI客戶端初始化失敗:', error instanceof Error ? error.message : '未知錯誤');
}

// R2 存儲客戶端配置
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// 從R2獲取Markdown文件
async function getMarkdownFromR2(markdownKey: string): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: markdownKey,
  });
  
  const response = await R2.send(command);
  const stream = response.Body as { transformToByteArray(): Promise<Uint8Array> };
  
  // 將流數據轉換為Buffer，再轉為字符串
  const buffer = Buffer.from(await stream.transformToByteArray());
  return buffer.toString('utf-8');
}

// 保存處理結果為Markdown
async function saveMarkdownToR2(content: string, fileId: string): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
  const key = `processed/${fileId}-enhanced.md`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
  });
  
  await R2.send(command);
  return key;
}

// 保存Markdown到本地存儲
async function saveMarkdownToLocal(content: string, fileId: string): Promise<string> {
  // 創建目錄（如果不存在）
  const dirPath = path.join(process.cwd(), 'public', 'processed-markdown');
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // 寫入文件
  const filePath = path.join(dirPath, `${fileId}-enhanced.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  // 返回公開訪問路徑
  return `/processed-markdown/${fileId}-enhanced.md`;
}

// ***** 內容處理Agent - 單一的Agent來處理所有文本需求 *****
async function contentProcessingAgent(markdownContent: string): Promise<{
  enhancedContent: string;
  metadata: {
    detectedLanguage: string;
    wasTranslated: boolean;
    contentSummary?: string;
  };
}> {
  if (!openai) {
    throw new Error('OpenAI客戶端未初始化');
  }

  // 系統提示詞 - 可以在這裡自定義AI的任務和指示
  const systemPrompt = `你是一個專業的內容處理AI助手，專門處理Markdown格式的文章。你的任務是：

1. 自動識別文本語言（中文繁體、中文簡體、英文或其他）
2. 如果不是繁體中文，將內容翻譯成地道的台灣繁體中文
3. 優化Markdown格式，保持標題層級正確、段落清晰、列表正確
4. 生成一個簡短的內容摘要（不超過100字）
5. 保留原始文章的所有重要信息和細節

請保持專業的寫作風格，確保輸出的Markdown格式完整正確，可以直接顯示。

你必須以JSON格式回應，包含以下欄位：
- enhancedContent: 處理後的Markdown內容
- detectedLanguage: 檢測到的語言代碼 (如"zh-TW", "zh-CN", "en"等)
- wasTranslated: 布林值，表示內容是否經過翻譯
- contentSummary: 內容摘要

JSON結構範例：
{
  "enhancedContent": "# 文章標題\\n\\n內容...",
  "detectedLanguage": "zh-TW",
  "wasTranslated": false,
  "contentSummary": "這是一篇關於..."
}`;

  // 用戶提示詞 - 指示如何處理特定內容
  const userPrompt = `請處理以下Markdown文本，按照系統說明的要求進行識別、翻譯（如需要）和格式優化，並以JSON格式返回結果：

${markdownContent}`;

  // ===== 可調整的模型參數 =====
  const modelConfig = {
    model: "gpt-4o",          // 可選: gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo
    temperature: 0.3,         // 控制創造性 (0.0-1.0)
    max_tokens: 8000,         // 最大輸出長度
    top_p: 1,                 // 控制輸出多樣性
    frequency_penalty: 0,     // 減少重複
    presence_penalty: 0,      // 鼓勵主題多樣性
    response_format: { type: "json_object" as const }  // 要求以JSON格式輸出
  };

  try {
    const response = await openai.chat.completions.create({
      ...modelConfig,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    // 解析JSON響應
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI回應為空');
    }

    try {
      const parsedResponse = JSON.parse(content);
      
      // 期望的響應格式
      return {
        enhancedContent: parsedResponse.enhancedContent || markdownContent,
        metadata: {
          detectedLanguage: parsedResponse.detectedLanguage || 'unknown',
          wasTranslated: parsedResponse.wasTranslated || false,
          contentSummary: parsedResponse.contentSummary
        }
      };
    } catch (parseError) {
      console.error('無法解析JSON響應:', parseError);
      // 如果不是有效JSON，直接返回原始內容
      return {
        enhancedContent: content,
        metadata: {
          detectedLanguage: 'unknown',
          wasTranslated: false
        }
      };
    }
  } catch (error) {
    console.error('Agent處理失敗:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { fileId, markdownKey } = requestBody;
    
    if (!fileId || !markdownKey) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log('接收到內容處理請求:', { fileId, markdownKey });

    // 檢查OpenAI是否初始化成功
    if (!openai) {
      console.error('OpenAI客戶端未初始化，跳過處理');
      return NextResponse.json(
        { 
          error: 'OpenAI API密鑰無效或未設置，無法進行AI處理',
          skipAI: true,
          fileId,
          markdownKey,
          status: 'skipped-ai-processing'
        },
        { status: 200 }
      );
    }
    
    // 從R2獲取Markdown文件
    let markdownContent;
    try {
      markdownContent = await getMarkdownFromR2(markdownKey);
      console.log('成功從R2獲取Markdown, 長度:', markdownContent.length);
    } catch (error) {
      console.error('從R2獲取Markdown失敗:', error);
      return NextResponse.json(
        { error: '無法從存儲中獲取Markdown文件' },
        { status: 500 }
      );
    }
    
    // 使用Agent處理內容
    console.log('開始使用AI處理內容...');
    const processingResult = await contentProcessingAgent(markdownContent);
    console.log('AI處理完成，獲取結果');
    
    // 添加處理元數據
    const finalMarkdown = `---
source: ai-enhanced
fileId: ${fileId}
detectedLanguage: ${processingResult.metadata.detectedLanguage}
wasTranslated: ${processingResult.metadata.wasTranslated}
processTime: ${new Date().toISOString()}
${processingResult.metadata.contentSummary ? `summary: ${processingResult.metadata.contentSummary}` : ''}
---

${processingResult.enhancedContent}`;
    
    // 保存處理後的Markdown
    const r2Key = await saveMarkdownToR2(finalMarkdown, fileId);
    const localPath = await saveMarkdownToLocal(finalMarkdown, fileId);
    
    return NextResponse.json({
      success: true,
      fileId,
      detectedLanguage: processingResult.metadata.detectedLanguage,
      wasTranslated: processingResult.metadata.wasTranslated,
      contentSummary: processingResult.metadata.contentSummary,
      markdownKey: r2Key,
      markdownUrl: localPath,
      status: 'processed-by-ai-agent',
    });
    
  } catch (error) {
    console.error('處理錯誤:', error);
    return NextResponse.json(
      { error: '內容處理失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
} 