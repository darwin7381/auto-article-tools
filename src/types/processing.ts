// 處理流程相關類型定義

import type { WordPressPostStatus } from './wordpress';

// 處理模式類型
export type ProcessingMode = 'auto' | 'manual';

// 處理模式選擇器Props
export interface ProcessingModeSelectorProps {
  isAutoMode: boolean;
  defaultPublishStatus?: WordPressPostStatus;
  onChange: (isAuto: boolean) => void;
  onPublishStatusChange?: (status: WordPressPostStatus) => void;
}

// 文件輸入類型
export type FileInputType = 'file' | 'link';

// 連結類型
export type LinkType = 'website' | 'gdocs' | 'medium' | 'wechat';

// 上傳區塊Props
export interface UploadSectionProps {
  selectedFile: File | null;
  onFileChange: (file: File) => void;
  selectedInputType: FileInputType;
  setSelectedInputType: (type: FileInputType) => void;
  linkUrl: string;
  onLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  linkType: string;
  setLinkType: (type: string) => void;
  urlError: string | null;
  uploadError: string | null;
  uploadSuccess: boolean;
  processSuccess: boolean;
  isProcessing: boolean;
  onProcess: () => void;
  isAutoMode: boolean;
  onModeChange: (isAuto: boolean) => void;
  selectedArticleType: import('./article-formatting').ArticleType;
  onArticleTypeChange: (type: import('./article-formatting').ArticleType) => void;
} 