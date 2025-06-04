import { ArticleTemplate, ArticleTypeOption, ArticleType, AdvancedArticleSettings, DisclaimerType } from '@/types/article-formatting';

// 共用模板配置 - 統一管理所有類型都相同的模板
const CommonTemplates = {
  // 共用樣式模板
  dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
  
  // 共用引言模板
  introQuoteTemplate: `<p class="intro_quote">{excerpt}<br>（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）<br>（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）</p>`,
  
  // 共用預設關聯文章配置
  defaultRelatedArticles: {
    contextUrl: 'https://www.blocktempo.com/sample-context-article/',
    contextTitle: '範例前情文章標題',
    backgroundUrl: 'https://www.blocktempo.com/sample-background-article/', 
    backgroundTitle: '範例背景文章標題'
  },
  
  // 共用 TG Banner
  tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
  
  // 共用相關閱讀標題
  relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
  
  // 共用預設相關閱讀文章
  defaultRelatedReading: [
    { url: 'https://www.blocktempo.com/sample-article-1/', title: '範例相關文章標題一' },
    { url: 'https://www.blocktempo.com/sample-article-2/', title: '範例相關文章標題二' },
    { url: 'https://www.blocktempo.com/sample-article-3/', title: '範例相關文章標題三' }
  ],
  
  // 共用技術配置
  relatedArticlesCount: { min: 2, max: 4 },
  maxExternalLinks: 3,
  excludeLinkTypes: ['telegram', 'line'],
  imageSize: { width: 750, height: 375 }, // 2:1 ratio
  maxImageSizeMB: 2,
  
  // 共用連結模板（基礎版本，sponsored 可以覆蓋）
  relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>'
};

// 文章模板配置
export const ArticleTemplates: Record<ArticleType, ArticleTemplate> = {
  sponsored: {
    name: '廣編稿',
    author: 'BTEditor',
    authorDisplayName: '廣編頻道（BTEditor）',
    authorId: 1, // 設定實際的WordPress作者ID
    requiresAdTemplate: true,
    adTemplateUrl: 'https://www.canva.com/design/DAFvcOqDOD8/msglmQ4I-dU3Pq8R9m2mlg/edit',
    
    headerDisclaimer: '<span style="color: #808080;"><em>（本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。）</em></span>',
    
    footerDisclaimer: '<div class="alert alert-warning">（廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。）</div>',
    
    // 使用共用模板
    dropcapStyle: CommonTemplates.dropcapStyle,
    introQuoteTemplate: CommonTemplates.introQuoteTemplate,
    defaultRelatedArticles: CommonTemplates.defaultRelatedArticles,
    tgBanner: CommonTemplates.tgBanner,
    relatedArticlesHeader: CommonTemplates.relatedArticlesHeader,
    defaultRelatedReading: CommonTemplates.defaultRelatedReading,
    relatedArticlesCount: CommonTemplates.relatedArticlesCount,
    maxExternalLinks: CommonTemplates.maxExternalLinks,
    excludeLinkTypes: CommonTemplates.excludeLinkTypes,
    imageSize: CommonTemplates.imageSize,
    maxImageSizeMB: CommonTemplates.maxImageSizeMB,
    
    // 廣編稿特殊的紅色連結樣式
    relatedArticleLinkTemplate: '<strong><span style="color: #ff0000;"><a href="{url}">{title}</a></span></strong>',

    fullTemplate: `{introQuote}

&nbsp;

{headerDisclaimer}

<hr />

{dropcapContent}

{mainContent}

＿＿＿

{footerDisclaimer}

{tgBanner}

{relatedArticlesHeader}
{relatedArticles}`
  },
  
  'press-release': {
    name: '新聞稿',
    author: 'BTVerse',
    authorDisplayName: 'BT宙域（BTVerse）',
    authorId: 2, // 設定實際的WordPress作者ID
    requiresAdTemplate: false,
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    
    footerDisclaimer: null,
    
    // 使用共用模板
    dropcapStyle: CommonTemplates.dropcapStyle,
    introQuoteTemplate: CommonTemplates.introQuoteTemplate,
    defaultRelatedArticles: CommonTemplates.defaultRelatedArticles,
    tgBanner: CommonTemplates.tgBanner,
    relatedArticlesHeader: CommonTemplates.relatedArticlesHeader,
    relatedArticleLinkTemplate: CommonTemplates.relatedArticleLinkTemplate,
    defaultRelatedReading: CommonTemplates.defaultRelatedReading,
    relatedArticlesCount: CommonTemplates.relatedArticlesCount,
    maxExternalLinks: CommonTemplates.maxExternalLinks,
    excludeLinkTypes: CommonTemplates.excludeLinkTypes,
    imageSize: CommonTemplates.imageSize,
    maxImageSizeMB: CommonTemplates.maxImageSizeMB,

    fullTemplate: `{introQuote}

{headerDisclaimer}

<hr />

<span style="font-weight: 400;">{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`
  },
  
  regular: {
    name: '一般文章',
    author: 'custom',
    authorDisplayName: null,
    authorId: undefined, // 不指定作者ID，由用戶設定
    requiresAdTemplate: false,
    
    headerDisclaimer: null,
    footerDisclaimer: null,
    
    // 使用共用模板
    dropcapStyle: CommonTemplates.dropcapStyle,
    introQuoteTemplate: CommonTemplates.introQuoteTemplate,
    defaultRelatedArticles: CommonTemplates.defaultRelatedArticles,
    tgBanner: CommonTemplates.tgBanner,
    relatedArticlesHeader: CommonTemplates.relatedArticlesHeader,
    relatedArticleLinkTemplate: CommonTemplates.relatedArticleLinkTemplate,
    defaultRelatedReading: CommonTemplates.defaultRelatedReading,
    relatedArticlesCount: CommonTemplates.relatedArticlesCount,
    maxExternalLinks: CommonTemplates.maxExternalLinks,
    excludeLinkTypes: CommonTemplates.excludeLinkTypes,
    imageSize: CommonTemplates.imageSize,
    maxImageSizeMB: CommonTemplates.maxImageSizeMB,

    fullTemplate: `{introQuote}

{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`
  }
};

// 文稿類型選項配置 - 簡化版本
export const ArticleTypeOptions: ArticleTypeOption[] = [
  {
    value: 'regular',
    label: '一般文章',
    description: '標準的動區文章格式',
    authorInfo: {
      displayName: '自訂作者',
      handle: 'custom'
    }
  },
  {
    value: 'sponsored',
    label: '廣編稿',
    description: '商業合作內容，包含免責聲明',
    authorInfo: {
      displayName: '廣編頻道（BTEditor）',
      handle: 'BTEditor',
      id: 1
    }
  },
  {
    value: 'press-release',
    label: '新聞稿',
    description: '企業或機構發佈的官方新聞稿',
    authorInfo: {
      displayName: 'BT宙域（BTVerse）',
      handle: 'BTVerse',
      id: 2
    }
  }
];

// 押註選項配置
export const DisclaimerOptions = [
  { value: 'none' as DisclaimerType, label: '不押註' },
  { value: 'sponsored' as DisclaimerType, label: '廣編稿押註' },
  { value: 'press-release' as DisclaimerType, label: '新聞稿押註' }
];

// 不同文稿類型的進階設定預設值
export const DefaultAdvancedSettings: Record<ArticleType, AdvancedArticleSettings> = {
  regular: {
    headerDisclaimer: 'none',
    footerDisclaimer: 'none',
    authorName: undefined
  },
  sponsored: {
    headerDisclaimer: 'sponsored',
    footerDisclaimer: 'sponsored',
    authorName: undefined
  },
  'press-release': {
    headerDisclaimer: 'press-release',
    footerDisclaimer: 'none',
    authorName: undefined
  }
};

// 獲取文稿類型配置
export function getArticleTemplate(articleType: ArticleType): ArticleTemplate {
  return ArticleTemplates[articleType];
}

// 獲取文稿類型選項
export function getArticleTypeOption(articleType: ArticleType): ArticleTypeOption | undefined {
  return ArticleTypeOptions.find(option => option.value === articleType);
}

// 驗證文稿類型
export function isValidArticleType(type: string): type is ArticleType {
  return ['regular', 'sponsored', 'press-release'].includes(type);
} 