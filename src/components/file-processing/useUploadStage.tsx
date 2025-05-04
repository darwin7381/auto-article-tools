import { useProcessing } from '@/context/ProcessingContext';

interface UseUploadStageProps {
  // 默認參數，可在調用時動態替換
  inputType: 'file' | 'url';
  selectedFile?: File | null;
  linkUrl?: string;
  linkType?: string;
}

interface UseUploadStageCallbacks {
  setUploadSuccess: (success: boolean) => void;
  setUploadError: (error: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
  onFileUploadComplete?: (fileUrl: string, fileType: string, fileId: string) => void;
  onUrlProcessComplete?: (urlId: string) => void;
}

// 執行時的參數
interface StartProcessingParams {
  selectedFile?: File;
  linkUrl?: string;
  linkType?: string;
  inputType?: 'file' | 'url';
}

/**
 * 上傳階段處理Hook
 * 負責處理文件上傳和URL提交的第一階段處理邏輯
 */
export default function useUploadStage(
  props: UseUploadStageProps,
  callbacks: UseUploadStageCallbacks
) {
  const { 
    setUploadSuccess,
    setUploadError,
    setIsUploading,
    onFileUploadComplete,
    onUrlProcessComplete
  } = callbacks;
  
  const { 
    startFileProcessing, 
    startUrlProcessing,
    updateStageProgress, 
    completeStage, 
    moveToNextStage,
    setStageError
  } = useProcessing();

  // 處理文件上傳
  const processFileUpload = async (file: File) => {
    if (!file) {
      setUploadError('請選擇要上傳的文件');
      return;
    }

    setIsUploading(true);
    
    try {
      // 初始化處理進度追蹤
      const fileId = `file-${Date.now()}`;
      startFileProcessing(fileId, file.name, file.type, file.size);
      
      // 更新上傳階段進度
      updateStageProgress('upload', 20, '準備上傳文件...');
      
      // 使用FormData發送文件
      const formData = new FormData();
      formData.append('file', file);
      
      updateStageProgress('upload', 50, '正在上傳文件...');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上傳失敗');
      }
      
      const data = await response.json();
      setUploadSuccess(true);
      
      // 完成上傳階段，進入提取階段
      updateStageProgress('upload', 100, '文件上傳完成');
      completeStage('upload', '文件上傳成功');
      moveToNextStage();
      
      // 傳遞文件URL和類型給後續階段
      if (onFileUploadComplete) {
        onFileUploadComplete(data.fileUrl, file.type, fileId);
      }
    } catch (error) {
      console.error('上傳錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '上傳失敗，請稍後重試');
      setUploadSuccess(false);
      setStageError('upload', error instanceof Error ? error.message : '上傳失敗，請稍後重試');
    } finally {
      setIsUploading(false);
    }
  };

  // 處理URL提交
  const processUrlSubmit = async (url: string, type: string = 'website') => {
    if (!url) {
      setUploadError('請輸入有效的連結');
      return;
    }

    setIsUploading(true);
    
    try {
      // 初始化URL處理進度
      startUrlProcessing(url, type);
      
      // 第一階段：URL 解析/上傳
      updateStageProgress('upload', 30, '正在處理URL...');
      
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type }),
      });
      
      updateStageProgress('upload', 70, '正在解析URL內容...');
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '連結處理失敗');
      }
      
      console.log('連結處理成功:', data);
      setUploadSuccess(true);
      
      // 完成第一階段：URL 解析/上傳
      updateStageProgress('upload', 100, 'URL解析完成');
      completeStage('upload', 'URL解析完成');
      moveToNextStage();
      
      // 傳遞urlId給後續階段
      if (onUrlProcessComplete) {
        onUrlProcessComplete(data.urlId);
      }
    } catch (error) {
      console.error('連結處理錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '連結處理失敗，請稍後再試');
      setUploadSuccess(false);
      
      setStageError('upload', error instanceof Error ? error.message : '處理失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  // 啟動處理流程 - 支持傳入動態參數
  const startProcessing = async (params?: StartProcessingParams) => {
    // 合併默認參數和傳入的參數
    const finalParams = {
      ...props, // 使用初始化時的默認參數
      ...params, // 覆蓋為調用時傳入的參數
    };
    
    const inputType = finalParams.inputType || props.inputType;
    
    if (inputType === 'file') {
      const file = finalParams.selectedFile || props.selectedFile;
      if (file) {
        await processFileUpload(file);
      } else {
        setUploadError('請選擇要上傳的文件');
      }
    } else if (inputType === 'url') {
      const url = finalParams.linkUrl || props.linkUrl || '';
      const type = finalParams.linkType || props.linkType || 'website';
      if (url) {
        await processUrlSubmit(url, type);
      } else {
        setUploadError('請輸入有效的連結');
      }
    }
  };

  return { startProcessing };
} 