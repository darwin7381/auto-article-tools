import { ArticleTemplate, ContentProcessingConfig as ContentProcessingConfigType, ArticleTypeOption, ArticleType } from '@/types/article-formatting';

// 文章模板配置
export const ArticleTemplates: Record<ArticleType, ArticleTemplate> = {
  sponsored: {
    name: '廣編稿',
    author: 'BTEditor',
    authorDisplayName: '廣編頻道（BTEditor）',
    authorId: 1, // 設定實際的WordPress作者ID
    requiresAdTemplate: true,
    adTemplateUrl: 'https://www.canva.com/design/DAFvcOqDOD8/msglmQ4I-dU3Pq8R9m2mlg/edit',
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
    
    footerDisclaimer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>',
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
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
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  'press-release': {
    name: '新聞稿',
    author: 'BTVerse',
    authorDisplayName: 'BT宙域（BTVerse）',
    authorId: 2, // 設定實際的WordPress作者ID
    requiresAdTemplate: false,
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}
（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）
（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{headerDisclaimer}

<hr />

<span style="font-weight: 400;">{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  regular: {
    name: '一般文章',
    author: 'custom',
    authorDisplayName: null,
    authorId: undefined, // 不指定作者ID，由用戶設定
    requiresAdTemplate: false,
    
    headerDisclaimer: null,
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  }
};

// 內容處理規則配置
export const ContentProcessingRules: ContentProcessingConfigType = {
  // 中文用語轉換規則
  terminologyMap: {
    '網絡': '網路',
    '信息': '資訊', // 預設為資訊，可依上下文調整為訊息
    '數據': '資料',
    '網站': '網站',
    '服務器': '伺服器',
    '用戶': '使用者',
    '軟件': '軟體',
    '數字': '數位'
  },
  
  // 標題層級規則
  headingHierarchy: ['h3', 'h4', 'strong'], // 標題三 > 標題四 > 粗體
  
  // 需要排除的內容
  excludePatterns: [
    /EMBARGOED\s+TILL\s+.+/gi, // 發布時間解禁敘述
    /禁止轉載\s+.+/gi,
    /版權所有\s+.+/gi
  ],
  
  // 文末連結處理
  linkFiltering: {
    maxLinks: 3,
    excludePatterns: [
      /telegram/gi,
      /line/gi,
      /t\.me/gi,
      /line\.me/gi
    ]
  },
  
  // 圖片處理規則
  imageProcessing: {
    maxSizeMB: 2,
    recommendedDimensions: { width: 750, height: 375 },
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    compressionSettings: {
      quality: 0.8,
      format: 'jpg' // PNG轉JPG減少檔案大小
    }
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