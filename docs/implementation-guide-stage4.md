# 上稿階段實現文檔

## 概述

本文檔詳細說明了自動文章處理流程第4階段（上稿階段）的設計與實現。此階段將原有的「處理結果」階段重新定義為兩個子階段：「上稿準備」和「上架新聞」，以支持完整的文章發布流程。

## 階段定義

將原有的單一「complete」階段拆分為：

1. **上稿準備 (prep-publish)**：將處理好的內容載入到編輯器中，供用戶進行最終內容調整
2. **上架新聞 (publish-news)**：將編輯後的內容發布到WordPress平台

## 核心組件實現

### 1. ProcessingContext 修改

在 `ProcessingContext.tsx` 中，將原有的階段定義更新為：

```typescript
export type ProcessingStage = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'enhancing'
  | 'prep-publish'    // 新增：上稿準備階段
  | 'publish-news'    // 新增：上架新聞階段
  | 'error';
```

### 2. WordPress服務模組

創建 `services/wordpress/wordpressService.ts` 來處理與WordPress API的交互：

```typescript
/**
 * WordPress服務 - 提供與WordPress API交互的能力
 */

// WordPress API基本URL
const WP_API_BASE = process.env.WORDPRESS_API_URL || '';
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';

interface WordPressCredentials {
  username: string;
  password: string;
}

interface PublishOptions {
  title: string;
  content: string;
  excerpt?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  status?: 'publish' | 'draft' | 'pending' | 'future';
}

/**
 * 發布文章到WordPress
 * @param options 發布選項
 * @param credentials 認證資訊（可選，默認使用環境變數）
 * @returns 發布結果，包含文章ID和URL
 */
export async function publishPost(
  options: PublishOptions, 
  credentials?: WordPressCredentials
): Promise<{ id: number; url: string }> {
  const auth = credentials || {
    username: WP_API_USER,
    password: WP_API_PASSWORD
  };
  
  // 基本授權標頭
  const authHeader = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
  
  try {
    const response = await fetch(`${WP_API_BASE}/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        title: options.title,
        content: options.content,
        excerpt: options.excerpt || '',
        status: options.status || 'draft',
        categories: options.categories || [],
        tags: options.tags || [],
        featured_media: options.featured_media || 0
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WordPress API錯誤: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      url: data.link
    };
  } catch (error) {
    console.error('發布到WordPress失敗:', error);
    throw new Error(`發布文章失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 驗證WordPress憑證
 * @param credentials 認證資訊
 * @returns 是否有效
 */
export async function validateCredentials(credentials: WordPressCredentials): Promise<boolean> {
  const authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  
  try {
    const response = await fetch(`${WP_API_BASE}/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### 3. 瀏覽器端存儲服務

修改 `services/storage/localService.ts`，移除對本地文件系統的依賴，專注於瀏覽器localStorage功能：

```typescript
/**
 * 本地存儲服務 - 客戶端版本（僅處理瀏覽器本地存儲）
 */

/**
 * 將內容保存到本地存儲（向後兼容API，實際上不做任何操作）
 * @param content 要保存的內容
 * @param fileName 文件名
 * @returns 公開訪問路徑
 */
export function saveToLocalStorage(content: string, fileName: string): string {
  // 不再使用本地存儲，僅依賴R2
  // 返回空字符串，讓系統使用publicUrl
  console.log(`不再保存到本地存儲，fileName: ${fileName}`);
  return '';
}

/**
 * 將編輯器內容保存到瀏覽器的 localStorage
 * @param content 編輯器內容 (HTML 格式)
 * @param fileId 文件ID
 * @returns 是否保存成功
 */
export function saveEditorContent(content: string, fileId: string): boolean {
  try {
    // 確保僅在瀏覽器環境中執行
    if (typeof window !== 'undefined') {
      // 儲存內容到 localStorage，使用前綴避免衝突
      const key = `editor_content_${fileId}`;
      localStorage.setItem(key, content);
      console.log(`編輯器內容已保存到 localStorage，key: ${key}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存編輯器內容到 localStorage 失敗:', error);
    return false;
  }
}

/**
 * 從 localStorage 獲取編輯器內容
 * @param fileId 文件ID
 * @returns 編輯器內容或null（如果不存在）
 */
export function getEditorContent(fileId: string): string | null {
  try {
    // 確保僅在瀏覽器環境中執行
    if (typeof window !== 'undefined') {
      const key = `editor_content_${fileId}`;
      return localStorage.getItem(key);
    }
    return null;
  } catch (error) {
    console.error('從 localStorage 獲取編輯器內容失敗:', error);
    return null;
  }
}
```

### 4. 發布階段功能鉤子

創建 `hooks/usePublishingStage.ts` 來管理上稿流程：

```typescript
import { useState, useEffect, useCallback } from 'react';
import { saveEditorContent, getEditorContent } from '@/services/storage/localService';
import { publishPost } from '@/services/wordpress/wordpressService';

interface PublishingOptions {
  fileId: string;
  initialHtml?: string;
  markdownUrl?: string;
}

interface WordPressPublishOptions {
  title: string;
  content: string;
  categories?: number[];
  tags?: number[];
  status?: 'publish' | 'draft' | 'pending';
}

interface PublishingResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

/**
 * 上稿階段功能鉤子
 */
export function usePublishingStage(options: PublishingOptions) {
  const { fileId, initialHtml, markdownUrl } = options;
  
  // 編輯器內容狀態
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishingResult, setPublishingResult] = useState<PublishingResult | null>(null);
  
  // 初始化 - 嘗試從localStorage加載內容或使用初始HTML
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        
        // 先嘗試從localStorage獲取編輯器內容
        const savedContent = getEditorContent(fileId);
        
        if (savedContent) {
          // 如果有已保存的內容，直接使用
          setEditorContent(savedContent);
        } else if (initialHtml) {
          // 如果沒有已保存內容但有初始HTML，使用初始HTML
          setEditorContent(initialHtml);
          // 順便保存到localStorage
          saveEditorContent(initialHtml, fileId);
        } else if (markdownUrl) {
          // 如果有Markdown URL，嘗試獲取並轉換
          try {
            const response = await fetch(markdownUrl);
            if (response.ok) {
              const markdownContent = await response.text();
              // 這裡簡化處理，實際可能需要更複雜的markdown->html轉換
              const html = `<div>${markdownContent.replace(/\n/g, '<br/>')}</div>`;
              setEditorContent(html);
              saveEditorContent(html, fileId);
            }
          } catch (error) {
            console.error('獲取Markdown內容失敗:', error);
          }
        }
      } catch (error) {
        console.error('加載編輯器內容失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [fileId, initialHtml, markdownUrl]);
  
  // 保存編輯器內容到localStorage
  const handleSaveContent = useCallback((content: string) => {
    setIsSaving(true);
    setEditorContent(content);
    
    try {
      saveEditorContent(content, fileId);
    } catch (error) {
      console.error('保存編輯器內容失敗:', error);
    } finally {
      setIsSaving(false);
    }
  }, [fileId]);
  
  // 發布到WordPress
  const handlePublishToWordpress = useCallback(async (publishOptions: WordPressPublishOptions) => {
    setIsPublishing(true);
    setPublishingResult(null);
    
    try {
      const result = await publishPost({
        title: publishOptions.title,
        content: publishOptions.content,
        status: publishOptions.status || 'draft',
        categories: publishOptions.categories,
        tags: publishOptions.tags
      });
      
      setPublishingResult({
        success: true,
        postId: result.id,
        postUrl: result.url
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      
      setPublishingResult({
        success: false,
        error: errorMessage
      });
      
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, []);
  
  return {
    editorContent,
    setEditorContent: handleSaveContent,
    isLoading,
    isSaving,
    isPublishing,
    publishingResult,
    publishToWordpress: handlePublishToWordpress
  };
}
```

### 5. 集成到文件處理組件

更新 `components/file-processing/IntegratedFileProcessor.tsx` 以集成新的上稿功能：

```typescript
// ... 現有導入 ...
import { usePublishingStage } from '@/hooks/usePublishingStage';
import { TapEditor } from '@/components/ui/taptip-editor';
import { WordPressForm } from '@/components/ui/wordpress-form';

// ... 現有代碼 ...

// 處理上稿準備階段
const PrepPublishingStage = ({ fileId, markdownUrl }: { fileId: string, markdownUrl: string }) => {
  const {
    editorContent,
    setEditorContent,
    isLoading,
    isSaving
  } = usePublishingStage({
    fileId,
    markdownUrl
  });
  
  const handleContinue = () => {
    // 進入下一階段：發布到WordPress
    setProcessingStage('publish-news');
  };
  
  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold">上稿準備</h2>
      <p className="text-gray-600">請在下方編輯框中調整文章內容，完成後點擊「下一步」進入發布階段</p>
      
      {isLoading ? (
        <div className="w-full h-60 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <TapEditor
            initialContent={editorContent}
            onChange={setEditorContent}
            placeholder="編輯文章內容..."
          />
          
          <div className="flex justify-end space-x-2 mt-4">
            {isSaving && <span className="text-gray-500">正在保存...</span>}
            <Button onClick={handleContinue}>
              下一步：發布到WordPress
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// 處理上架新聞階段
const PublishNewsStage = ({ fileId }: { fileId: string }) => {
  const {
    editorContent,
    isPublishing,
    publishingResult,
    publishToWordpress
  } = usePublishingStage({ fileId });
  
  const [title, setTitle] = useState('');
  
  const handlePublish = async (formData: any) => {
    try {
      await publishToWordpress({
        title: formData.title,
        content: editorContent,
        categories: formData.categories,
        tags: formData.tags,
        status: formData.status
      });
    } catch (error) {
      console.error('發布失敗:', error);
    }
  };
  
  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold">上架新聞</h2>
      <p className="text-gray-600">填寫文章標題和分類，然後點擊「發布」按鈕將文章發布到WordPress</p>
      
      {publishingResult?.success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-green-800 font-medium">發布成功！</h3>
          <p className="text-green-700">文章已成功發布到WordPress</p>
          {publishingResult.postUrl && (
            <a 
              href={publishingResult.postUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              在WordPress中查看文章
            </a>
          )}
        </div>
      ) : (
        <WordPressForm 
          onSubmit={handlePublish}
          isSubmitting={isPublishing}
          error={publishingResult?.error}
        />
      )}
    </div>
  );
};

// 整合到現有渲染邏輯
const ProcessingStageContent = () => {
  // ... 現有代碼 ...
  
  // 根據不同階段渲染不同內容
  switch (processingStage) {
    // ... 現有階段 ...
    
    case 'prep-publish':
      return <PrepPublishingStage fileId={fileId} markdownUrl={markdownUrl} />;
    
    case 'publish-news':
      return <PublishNewsStage fileId={fileId} />;
      
    // ... 其他階段 ...
  }
};
```

## PDF處理服務優化

為了解決對本地文件系統的依賴問題，重構了PDF處理服務：

```typescript
import { uploadFileToR2 } from '../storage/r2Service';
import { DocxProcessResult } from './docxService';

/**
 * PDF 處理服務 - 提供PDF文件的處理與轉換功能
 * 注意：不使用本地文件系統，直接使用R2和內存操作
 */

// ConvertAPI Token
const CONVERT_API_TOKEN = process.env.CONVERT_API_TOKEN;
if (!CONVERT_API_TOKEN) {
  throw new Error('CONVERT_API_TOKEN 環境變量未設置');
}

// R2公開URL
const FILES_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * 將PDF轉換為DOCX（使用ConvertAPI直接轉換，無需本地文件系統）
 * @param pdfUrl PDF文件的R2鍵值
 * @returns 轉換後的DOCX文件的Buffer
 */
export async function convertPdfToDocx(pdfUrl: string): Promise<Buffer> {
  // 構建完整的PDF公開URL
  const fullPdfUrl = `${FILES_PUBLIC_URL}/${pdfUrl}`;
  console.log(`開始轉換PDF: ${fullPdfUrl}`);
  
  try {
    // 使用動態導入ConvertAPI
    const convertapiModule = await import('convertapi');
    const convertapi = new convertapiModule.default(CONVERT_API_TOKEN as string);
    
    // 直接使用完整URL進行轉換，獲取結果URL而非本地文件
    const result = await convertapi.convert('docx', {
      File: fullPdfUrl
    }, 'pdf');
    
    // 獲取轉換結果的URL
    const files = result.files;
    if (!files || files.length < 1) {
      throw new Error('轉換結果為空');
    }
    
    const fileUrl = files[0].url;
    console.log(`轉換後的文件URL: ${fileUrl}`);
    
    // 直接從URL下載文件內容
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下載轉換後的文件失敗: ${response.status} ${response.statusText}`);
    }
    
    // 將回應轉換為Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`DOCX文件大小: ${buffer.length}字節`);
    
    return buffer;
  } catch (error) {
    console.error('PDF轉換失敗:', error);
    throw new Error('PDF轉換失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
  }
}

/**
 * 處理PDF文件
 * @param fileUrl PDF文件在R2中的鍵值
 * @param fileId 文件ID
 * @returns 處理結果
 */
export async function processPdf(fileUrl: string, fileId: string): Promise<DocxProcessResult> {
  try {
    // 使用ConvertAPI將PDF轉換為DOCX
    const docxBuffer = await convertPdfToDocx(fileUrl);
    
    // 上傳DOCX到R2
    const docxKey = `upload/${fileId}.docx`;
    await uploadFileToR2(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // 通過process-file API處理DOCX
    return await processDocxViaApi(fileId, docxKey);
  } catch (error) {
    console.error('PDF處理失敗:', error);
    throw error;
  }
}

/**
 * 通過API處理DOCX文件
 * @param fileId 文件ID
 * @param docxKey DOCX文件在R2中的鍵值
 * @returns 處理結果
 */
async function processDocxViaApi(fileId: string, docxKey: string): Promise<DocxProcessResult> {
  try {
    // 直接導入所需服務
    const { getFileFromR2 } = await import('@/services/storage/r2Service');
    const { processDOCX } = await import('@/services/conversion/docxService');
    const { enhanceMarkdown } = await import('@/agents/contentAgent');
    
    // 從 R2 獲取 DOCX 文件
    const fileBuffer = await getFileFromR2(docxKey);
    
    // 直接處理 DOCX 文件
    const processResult = await processDOCX(fileBuffer, fileId);
    
    try {
      // 嘗試使用 AI Agent 進行處理
      const agentResult = await enhanceMarkdown(fileId, processResult.r2Key);
      
      return {
        success: true,
        fileId,
        markdownKey: agentResult.markdownKey,
        markdownUrl: agentResult.markdownUrl,
        status: 'processed-by-ai-agent',
      };
    } catch (aiError) {
      console.error('AI Agent 處理失敗:', aiError);
      
      // 如果 AI 處理失敗，返回基本處理結果
      return {
        success: true,
        fileId,
        markdownKey: processResult.r2Key,
        markdownUrl: processResult.localPath,
        status: 'processed',
      };
    }
  } catch (error) {
    console.error('直接處理 DOCX 失敗:', error);
    
    // 如果直接處理失敗，返回錯誤
    throw new Error(`處理 DOCX 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}
```

## 修正問題

在實現過程中，遇到了以下問題並進行修復：

1. **引用錯誤**：pdfService.ts 中引用了不存在的 `createTempDirectory` 函數
   - 解決方案：重構PDF服務，完全移除本地文件系統依賴，使用內存操作

2. **Linter錯誤**：pdfService.ts 中有關於轉換結果處理的錯誤
   - 修正了 `files.length === 0` 的比較（改為 `files.length < 1`）
   - 修正了 `files[0].Url` 的屬性訪問（改為 `files[0].url`）

3. **未使用參數**：Markdown服務中的 `createDocxMarkdown` 函數有未使用的參數
   - 從函數簽名中移除了未使用的 `fileId` 參數

## 總結

通過上述實現，我們成功將原有的「處理結果」階段重新定義為更完整的「上稿」流程，包含編輯內容和發布到WordPress的功能。同時，優化了整個系統的架構，消除了對本地文件系統的依賴，使得應用更適合在雲環境中運行。

這些改進使得文章處理工具的功能更加完整，從文件上傳到最終發布形成了一個閉環的工作流程，提升了整體用戶體驗和工作效率。 