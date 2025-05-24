// 文稿分類類型定義
export type ArticleType = 'regular' | 'sponsored' | 'press-release';

// 押註類型定義
export type DisclaimerType = 'none' | 'sponsored' | 'press-release';

// 進階文稿設定
export interface AdvancedArticleSettings {
  headerDisclaimer: DisclaimerType; // 正文開頭押註
  footerDisclaimer: DisclaimerType; // 正文末尾押註
  authorName?: string; // 供稿方名稱
}

// 文稿分類接口
export interface ArticleClassification {
  articleType: ArticleType;
  author?: 'BTEditor' | 'BTVerse' | 'custom';
  authorDisplayName?: string;
  authorId?: number; // 新增：WordPress作者ID
  requiresAdTemplate: boolean;
  templateVersion: string;
  timestamp: number; // 分類時間戳
  // 新增進階設定
  advancedSettings?: AdvancedArticleSettings;
}

// 文章分析結果
export interface ContentAnalysis {
  author_name?: string;
  chinese_terminology_fixes: string[];
  suggested_slug: string;
  excerpt: string;
  estimated_reading_time?: number;
}

// 關聯文章
export interface RelatedArticle {
  url: string;
  title: string;
  excerpt?: string;
  publishDate?: string;
  relevanceScore?: number;
}

// 關聯文章集合
export interface RelatedArticles {
  background: RelatedArticle[];
  previous_context: RelatedArticle[];
  related_reading: RelatedArticle[];
}

// 導入WordPress類型定義
import type { WordPressPublishData } from '@/types/wordpress';

// 增強版的Copy Editing結果 - 使用WordPress類型
export interface EnhancedCopyEditingResult {
  wordpress_params: WordPressPublishData; // 使用WordPress類型
  article_classification: ArticleClassification;
  content_analysis: ContentAnalysis;
  related_articles: RelatedArticles;
  author_info?: {
    name: string;
    type: 'individual' | 'organization';
    contact?: string;
    wordpress_id?: number; // WordPress作者ID
  };
}

// 文章格式化結果
export interface ArticleFormattingResult {
  formattedContent: string;
  template: ArticleTemplate;
  metadata: {
    author: string;
    authorId?: number; // WordPress作者ID
    requiresAdTemplate: boolean;
    adTemplateUrl?: string;
    appliedRules: string[];
    processingTime: number;
  };
}

// 文章模板接口
export interface ArticleTemplate {
  name: string;
  author: string;
  authorDisplayName: string | null;
  authorId?: number; // WordPress作者ID
  requiresAdTemplate: boolean;
  adTemplateUrl?: string;
  
  headerDisclaimer: string | null;
  footerDisclaimer: string | null;
  dropcapStyle: string;
  
  introQuoteTemplate: string;
  tgBanner: string;
  relatedArticlesHeader: string;
  relatedArticleLinkTemplate: string;
  fullTemplate: string;
  
  relatedArticlesCount: { min: number; max: number };
  maxExternalLinks: number;
  excludeLinkTypes: string[];
  imageSize: { width: number; height: number };
  maxImageSizeMB: number;
}

// 圖片處理結果
export interface ProcessedImageResult {
  processedImageUrl: string;
  originalSize: number;
  compressedSize: number;
  dimensions: { width: number; height: number };
  hasAdTemplate: boolean;
  processingTime: number;
}

// 內容處理規則配置
export interface ContentProcessingConfig {
  terminologyMap: Record<string, string>;
  headingHierarchy: string[];
  excludePatterns: RegExp[];
  linkFiltering: {
    maxLinks: number;
    excludePatterns: RegExp[];
  };
  imageProcessing: {
    maxSizeMB: number;
    recommendedDimensions: { width: number; height: number };
    supportedFormats: string[];
    compressionSettings: {
      quality: number;
      format: string;
    };
  };
}

// 文稿類型選項
export interface ArticleTypeOption {
  value: ArticleType;
  label: string;
  description: string;
  authorInfo: {
    displayName: string;
    handle: string;
    id?: number; // WordPress作者ID
  };
} 