import { AdvancedArticleSettings, DisclaimerType, EnhancedCopyEditingResult, ArticleFormattingResult } from '@/types/article-formatting';
import { ArticleTemplates } from '@/config/article-templates';

/**
 * 參數驅動的文章格式化處理器
 * 基於用戶設定的進階參數來決定格式化邏輯，而非文稿類型
 * 
 * 注意：本階段只處理格式化特定的功能，不處理以下已在前面AI Agent完成的功能：
 * - 移除發布解禁敘述（在前面AI Agent完成）
 * - 中文用語轉換（在前面AI Agent完成）
 * - 英文和數字前後空格處理（在前面AI Agent完成）
 */
export class ArticleFormattingProcessor {
  /**
   * 核心格式化邏輯 - 完全基於參數決定
   */
  async formatArticle(
    content: string,
    advancedSettings: AdvancedArticleSettings,
    analysisResult?: EnhancedCopyEditingResult
  ): Promise<ArticleFormattingResult> {
    
    let formattedContent = content;
    const appliedRules: string[] = [];
    
    try {
      // 1. 標題層級正規化（不動h1，只調整h2-h4）
      formattedContent = this.normalizeHeadings(formattedContent);
      appliedRules.push('應用標題正規化（h2→h3, h3→h4, h4→h5，修復連鎖替換問題）');
      
      // 2. 構建引言區塊（使用預設文章）
      const introQuote = this.buildIntroQuote(analysisResult?.content_analysis?.excerpt);
      if (introQuote) {
        formattedContent = introQuote + '\n\n&nbsp;\n\n' + formattedContent;
        appliedRules.push('插入引言區塊（含預設前情提要和背景補充）');
      }
      
      // 3. 處理開頭押註 - 基於 headerDisclaimer 參數
      if (advancedSettings.headerDisclaimer !== 'none') {
        const headerResult = this.applyHeaderDisclaimer(
          formattedContent, 
          advancedSettings.headerDisclaimer,
          advancedSettings.authorName
        );
        formattedContent = headerResult.content;
        appliedRules.push(headerResult.rule);
      }
      
      // 4. 應用 Dropcap 到第一段 - 使用統一的樣式配置
      formattedContent = this.applyDropcap(formattedContent);
      appliedRules.push('應用Dropcap格式到第一段開頭');
      
      // 5. 處理結尾押註 - 基於 footerDisclaimer 參數
      if (advancedSettings.footerDisclaimer !== 'none') {
        const footerResult = this.applyFooterDisclaimer(
          formattedContent,
          advancedSettings.footerDisclaimer
        );
        formattedContent = footerResult.content;
        appliedRules.push(footerResult.rule);
      }
      
      // 6. 添加 TG Banner 和相關閱讀區塊
      formattedContent = this.addTelegramBannerAndRelatedArticles(formattedContent);
      appliedRules.push('添加TG Banner和相關閱讀區塊（使用預設文章）');
      
      return {
        formattedContent,
        appliedSettings: advancedSettings,
        metadata: {
          hasHeaderDisclaimer: advancedSettings.headerDisclaimer !== 'none',
          hasFooterDisclaimer: advancedSettings.footerDisclaimer !== 'none',
          authorName: advancedSettings.authorName,
          appliedRules,
          processingTime: Date.now()
        }
      };
      
    } catch (error) {
      console.error('文章格式化處理出錯:', error);
      return {
        formattedContent: content, // 返回原始內容
        appliedSettings: advancedSettings,
        metadata: {
          hasHeaderDisclaimer: false,
          hasFooterDisclaimer: false,
          authorName: advancedSettings.authorName,
          appliedRules: ['格式化處理失敗，返回原始內容'],
          processingTime: Date.now(),
          error: error instanceof Error ? error.message : '未知錯誤'
        }
      };
    }
  }
  
  /**
   * 標題層級正規化 - 不動h1，只調整其他層級
   * 修復連鎖替換問題：從高層級往低層級進行替換
   */
  private normalizeHeadings(content: string): string {
    let normalized = content;
    
    // 重要：必須從高層級往低層級替換，避免連鎖替換問題
    // 先處理 h4 → h5
    normalized = normalized.replace(/<h4([^>]*)>/gi, '<h5$1>');
    normalized = normalized.replace(/<\/h4>/gi, '</h5>');
    
    // 再處理 h3 → h4
    normalized = normalized.replace(/<h3([^>]*)>/gi, '<h4$1>');
    normalized = normalized.replace(/<\/h3>/gi, '</h4>');
    
    // 最後處理 h2 → h3
    normalized = normalized.replace(/<h2([^>]*)>/gi, '<h3$1>');
    normalized = normalized.replace(/<\/h2>/gi, '</h3>');
    
    return normalized;
  }
  
  /**
   * 構建引言區塊 - 使用統一的模板配置
   */
  private buildIntroQuote(excerpt?: string): string {
    const defaultExcerpt = excerpt || 'AI 摘要引言，簡述本篇文章重點內容。';
    
    // 使用統一的引言模板（以 sponsored 為例，因為格式基本相同）
    const template = ArticleTemplates.sponsored.introQuoteTemplate;
    const defaults = ArticleTemplates.sponsored.defaultRelatedArticles;
    
    if (!defaults) {
      // 如果沒有預設配置，返回基本的引言
      return `<p class="intro_quote">${defaultExcerpt}</p>`;
    }
    
    return template
      .replace('{excerpt}', defaultExcerpt)
      .replace('{contextUrl}', defaults.contextUrl)
      .replace('{contextTitle}', defaults.contextTitle)
      .replace('{backgroundUrl}', defaults.backgroundUrl)
      .replace('{backgroundTitle}', defaults.backgroundTitle);
  }
  
  /**
   * 應用開頭押註 - 參數驅動
   */
  private applyHeaderDisclaimer(
    content: string, 
    disclaimerType: DisclaimerType,
    authorName?: string
  ): {content: string, rule: string} {
    
    const templates = this.getDisclaimerTemplates();
    const template = templates[disclaimerType]?.header;
    
    if (!template) {
      return { content, rule: `跳過開頭押註：未找到 ${disclaimerType} 模板` };
    }
    
    let disclaimer = template;
    if (authorName && template.includes('［撰稿方名稱］')) {
      disclaimer = template.replace(/［撰稿方名稱］/g, authorName);
    }
    
    // 構建開頭押註區塊（不包含分隔線）
    const disclaimerBlock = disclaimer;
    
    // 尋找引言區塊的結束位置
    const introQuoteMatch = content.match(/(<p class="intro_quote">[\s\S]*?<\/p>)/);
    
    if (introQuoteMatch) {
      // 如果找到引言區塊，在其後插入押註（用兩個br分隔）
      const introQuote = introQuoteMatch[1];
      const restContent = content.substring(content.indexOf(introQuote) + introQuote.length);
      const insertedContent = introQuote + '<br><br>' + disclaimerBlock + restContent.trim();
      
      return {
        content: insertedContent,
        rule: `應用開頭押註：${disclaimerType}${authorName ? ` (供稿方: ${authorName})` : ''}（插入到引言區塊後，用兩個br分隔）`
      };
    } else {
      // 如果沒有引言區塊，直接在內容開頭插入押註
      const insertedContent = disclaimerBlock + content;
      
      return {
        content: insertedContent,
        rule: `應用開頭押註：${disclaimerType}${authorName ? ` (供稿方: ${authorName})` : ''}（插入到內容開頭）`
      };
    }
  }
  
  /**
   * 應用 Dropcap 格式到第一段 - 使用統一的樣式配置
   * 重要：跳過引言區塊，找到真正的正文第一段
   */
  private applyDropcap(content: string): string {
    // 使用正則表達式找到所有段落標籤
    const paragraphMatches = content.match(/<p[^>]*>.*?<\/p>/gi);
    if (!paragraphMatches || paragraphMatches.length === 0) return content;
    
    // 找到第一個非引言區塊的段落
    let targetParagraph = null;
    
    for (let i = 0; i < paragraphMatches.length; i++) {
      const paragraph = paragraphMatches[i];
      // 跳過引言區塊（class="intro_quote"）
      if (!paragraph.includes('class="intro_quote"')) {
        targetParagraph = paragraph;
        break;
      }
    }
    
    if (!targetParagraph) return content;
    
    // 提取段落內容
    const paragraphContentMatch = targetParagraph.match(/<p[^>]*>(.*?)<\/p>/i);
    if (!paragraphContentMatch) return content;
    
    const paragraphContent = paragraphContentMatch[1];
    
    // 提取第一個中文字符或英文字母
    const firstCharMatch = paragraphContent.match(/^[^<]*?([a-zA-Z\u4e00-\u9fa5])/);
    if (!firstCharMatch) return content;
    
    const firstChar = firstCharMatch[1];
    const remainingContent = paragraphContent.substring(paragraphContent.indexOf(firstChar) + 1);
    
    // 使用統一的 Dropcap 樣式配置
    const dropcapStyle = ArticleTemplates.sponsored.dropcapStyle;
    const newParagraph = targetParagraph.replace(
      paragraphContent,
      `${dropcapStyle}${firstChar}</span>${remainingContent}`
    );
    
    return content.replace(targetParagraph, newParagraph);
  }
  
  /**
   * 應用結尾押註 - 參數驅動
   */
  private applyFooterDisclaimer(
    content: string,
    disclaimerType: DisclaimerType
  ): {content: string, rule: string} {
    
    const templates = this.getDisclaimerTemplates();
    const template = templates[disclaimerType]?.footer;
    
    if (!template) {
      return { content, rule: `跳過結尾押註：${disclaimerType} 類型無結尾模板` };
    }
    
    // 在結尾押註前添加分隔線
    const footerWithSeparator = `\n\n<hr />\n\n${template}`;
    const insertedContent = content + footerWithSeparator;
    
    return {
      content: insertedContent,
      rule: `應用結尾押註：${disclaimerType}（在押註前添加分隔線）`
    };
  }
  
  /**
   * 添加 TG Banner 和相關閱讀區塊 - 使用統一的模板配置
   */
  private addTelegramBannerAndRelatedArticles(content: string): string {
    // 使用統一的 TG Banner 配置
    const tgBanner = ArticleTemplates.sponsored.tgBanner;
    
    // 使用統一的相關閱讀配置
    const relatedArticlesHeader = ArticleTemplates.sponsored.relatedArticlesHeader;
    const linkTemplate = ArticleTemplates.sponsored.relatedArticleLinkTemplate;
    const defaultArticles = ArticleTemplates.sponsored.defaultRelatedReading;
    
    // 使用預設的相關文章或空陣列
    const articles = defaultArticles || [
      { url: 'https://www.blocktempo.com/sample-article-1/', title: '範例相關文章標題一' },
      { url: 'https://www.blocktempo.com/sample-article-2/', title: '範例相關文章標題二' },
      { url: 'https://www.blocktempo.com/sample-article-3/', title: '範例相關文章標題三' }
    ];
    
    const relatedArticlesLinks = articles.map(article => 
      linkTemplate
        .replace('{url}', article.url)
        .replace('{title}', article.title)
    ).join('\n\n');
    
    const relatedArticlesSection = `${relatedArticlesHeader}\n${relatedArticlesLinks}`;
    
    return `${content}\n\n${tgBanner}\n\n${relatedArticlesSection}`;
  }
  
  /**
   * 獲取押註模板 - 使用統一的模板配置
   */
  private getDisclaimerTemplates() {
    return {
      sponsored: {
        header: ArticleTemplates.sponsored.headerDisclaimer,
        footer: ArticleTemplates.sponsored.footerDisclaimer
      },
      'press-release': {
        header: ArticleTemplates['press-release'].headerDisclaimer,
        footer: ArticleTemplates['press-release'].footerDisclaimer
      },
      none: {
        header: null,
        footer: null
      }
    };
  }
  
  /**
   * 驗證設定參數合法性
   */
  static validateSettings(settings: AdvancedArticleSettings): string[] {
    const warnings: string[] = [];
    
    // 檢查押註參數合法性
    const validDisclaimerTypes = ['none', 'sponsored', 'press-release'];
    if (!validDisclaimerTypes.includes(settings.headerDisclaimer)) {
      warnings.push(`無效的開頭押註類型：${settings.headerDisclaimer}`);
    }
    
    if (!validDisclaimerTypes.includes(settings.footerDisclaimer)) {
      warnings.push(`無效的結尾押註類型：${settings.footerDisclaimer}`);
    }
    
    // 檢查邏輯合理性
    if (settings.headerDisclaimer !== 'none' && !settings.authorName) {
      warnings.push('設定押註時建議填寫供稿方名稱，否則將顯示［撰稿方名稱］佔位符');
    }
    
    if (settings.headerDisclaimer === 'sponsored' && settings.footerDisclaimer === 'none') {
      warnings.push('廣編稿通常建議包含結尾免責聲明以符合法規要求');
    }
    
    return warnings;
  }
} 