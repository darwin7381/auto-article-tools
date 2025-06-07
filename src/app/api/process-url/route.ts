import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getApiUrl } from '@/services/utils/apiHelpers';
import { withRetry } from '@/agents/common/agentUtils';
import { apiAuth } from '@/middleware/api-auth';

// 定義URL信息的接口
interface UrlInfo {
  url: string;
  type: string;
  processResult: Record<string, unknown>;
  processTime: string;
  uploaded?: boolean;
  extracted?: boolean;
  aiProcessed?: boolean;
  publicUrl?: string;
  timestamp?: number;
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

// 從R2獲取URL信息
async function getUrlInfoFromR2(urlInfoKey: string): Promise<UrlInfo> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: urlInfoKey,
    });
    
    const response = await R2.send(command);
    const content = await response.Body?.transformToString();
    
    if (!content) {
      throw new Error('No content found in R2 object');
    }
    
    return JSON.parse(content) as UrlInfo;
  } catch (error) {
    console.error('從R2獲取URL信息失敗:', error);
    throw new Error('獲取URL信息失敗');
  }
}

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    const { urlInfoKey } = await request.json();
    
    if (!urlInfoKey) {
      return NextResponse.json(
        { error: '缺少必要參數：urlInfoKey' },
        { status: 400 }
      );
    }
    
    console.log('處理URL信息，Key:', urlInfoKey);
    
    try {
      // 從R2獲取URL信息
      const urlInfo = await getUrlInfoFromR2(urlInfoKey);
      console.log('成功獲取URL信息:', { 
        url: urlInfo.url,
        type: urlInfo.type,
        status: {
          uploaded: urlInfo.uploaded,
          extracted: urlInfo.extracted,
          aiProcessed: urlInfo.aiProcessed
        }
      });
      
      // 準備返回的響應數據
      const responseData = {
        success: true,
        url: urlInfo.url,
        type: urlInfo.type,
        processTime: urlInfo.processTime,
        uploaded: urlInfo.uploaded || false,
        extracted: urlInfo.extracted || false,
        aiProcessed: urlInfo.aiProcessed || false,
        publicUrl: urlInfo.publicUrl,
        timestamp: urlInfo.timestamp || Date.now(),
        processResult: urlInfo.processResult || {}
      };
      
      // 檢查是否需要進一步處理
      if (!urlInfo.extracted) {
        console.log('URL尚未提取內容，準備觸發內容提取...');
        
        // 準備內部 API 調用的認證頭部
        const internalApiHeaders = {
          'Content-Type': 'application/json',
        } as Record<string, string>;
        
        // 如果有 API_SECRET_KEY，使用它進行內部認證
        if (process.env.API_SECRET_KEY) {
          internalApiHeaders['x-api-key'] = process.env.API_SECRET_KEY;
        }
        
        // 觸發內容提取處理（如果適用）
        try {
          const extractResponse = await withRetry(
            async () => {
              return await fetch(getApiUrl('/api/extract-content'), {
                method: 'POST',
                headers: internalApiHeaders,
                body: JSON.stringify({
                  fileUrl: urlInfo.publicUrl || urlInfo.url,
                  fileId: urlInfoKey.replace(/^input\/url-(.+)\.json$/, '$1') || 'unknown',
                  fileType: urlInfo.type
                }),
              });
            },
            {
              maxRetries: 2,
              retryDelay: 1000,
              onRetry: (error, count) => {
                console.warn(`內容提取重試 #${count}：`, error.message);
              }
            }
          );
          
          if (extractResponse.ok) {
            const extractResult = await extractResponse.json();
            console.log('內容提取結果:', extractResult);
            
            // 更新響應數據
            responseData.extracted = true;
            responseData.processResult = { ...responseData.processResult, extractResult };
          } else {
            console.warn('內容提取失敗:', extractResponse.status, extractResponse.statusText);
          }
          
        } catch (extractError) {
          console.warn('內容提取處理失敗:', extractError);
          // 不中斷主流程，繼續返回基本信息
        }
      }
      
      return NextResponse.json(responseData);
      
    } catch (processingError) {
      console.error('URL處理錯誤:', processingError);
      throw processingError;
    }
    
  } catch (error) {
    console.error('URL處理失敗:', error);
    return NextResponse.json(
      { 
        error: 'URL處理失敗',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 