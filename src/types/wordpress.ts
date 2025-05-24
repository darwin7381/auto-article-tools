// WordPress相關類型定義

// WordPress發布狀態
export type WordPressPostStatus = 'publish' | 'draft' | 'pending' | 'future' | 'private';

// WordPress發布數據（表單數據結構）
export interface WordPressPublishData {
  title: string;
  categories?: string;
  tags?: string;
  status: WordPressPostStatus;
  isPrivate: boolean;
  slug?: string;
  author?: string;
  featured_media?: string;
  date?: string;
}

// WordPress API請求數據（內部API請求結構）
export interface WordPressPublishRequestData {
  title: string;
  content: string;
  status: WordPressPostStatus;
  categories?: number[];
  tags?: string[];
  isPrivate: boolean;
  slug?: string;
  author?: number;
  featured_media?: number;
  date?: string;
}

// WordPress發布結果
export interface WordPressPublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
  debugInfo?: {
    contentSample?: string;
    [key: string]: unknown;
  };
}

// WordPress設置組件的Props
export interface WordPressSettingsFormData {
  title: string;
  categories: string;
  tags: string;
  status: WordPressPostStatus;
  isPrivate: boolean;
  slug: string;
  author: string;
  featured_media: string;
  date: string;
}

// 自動提取的WordPress參數
export interface WordPressExtractedParams {
  categories?: Array<{ id: number; name?: string }>;
  tags?: Array<{ id: number; name?: string }>;
  slug?: string;
}

// WordPress設置組件Props
export interface WordPressSettingsProps {
  formData: WordPressSettingsFormData;
  onChange: (formData: WordPressSettingsFormData) => void;
  error?: string;
  detailedError?: string;
  extractedParams?: WordPressExtractedParams;
}

// WordPress整合Hook選項
export interface WordPressIntegrationOptions {
  initialContent?: string;
  fileId?: string;
  debug?: boolean;
} 