import { AdvancedArticleSettings, DisclaimerType, EnhancedCopyEditingResult, ArticleFormattingResult } from '@/types/article-formatting';

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
      
      // 4. 應用 Dropcap 到第一段
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
   * 構建引言區塊（使用預設文章）
   */
  private buildIntroQuote(excerpt?: string): string {
    const defaultExcerpt = excerpt || 'AI 摘要引言，簡述本篇文章重點內容。';
    
    return `<p class="intro_quote">${defaultExcerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="https://www.blocktempo.com/sample-background-article/" target="_blank" rel="noopener">範例背景文章標題</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="https://www.blocktempo.com/sample-context-article/" target="_blank" rel="noopener">範例前情文章標題</a></span>）</p>`;
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
    
    // 在引言區塊後插入押註
    const disclaimerWithSeparator = `${disclaimer}\n\n<hr />`;
    const insertedContent = content + '\n\n' + disclaimerWithSeparator;
    
    return {
      content: insertedContent,
      rule: `應用開頭押註：${disclaimerType}${authorName ? ` (供稿方: ${authorName})` : ''}`
    };
  }
  
  /**
   * 應用 Dropcap 格式到第一段
   */
  private applyDropcap(content: string): string {
    // 找到第一個段落標籤
    const firstParagraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
    if (!firstParagraphMatch) return content;
    
    const fullMatch = firstParagraphMatch[0];
    const paragraphContent = firstParagraphMatch[1];
    
    // 提取第一個中文字符或英文字母
    const firstCharMatch = paragraphContent.match(/^[^<]*?([a-zA-Z\u4e00-\u9fa5])/);
    if (!firstCharMatch) return content;
    
    const firstChar = firstCharMatch[1];
    const remainingContent = paragraphContent.substring(paragraphContent.indexOf(firstChar) + 1);
    
    const dropcapStyle = '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">';
    const newParagraph = fullMatch.replace(
      paragraphContent,
      `${dropcapStyle}${firstChar}</span>${remainingContent}`
    );
    
    return content.replace(fullMatch, newParagraph);
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
    
    // 在內容末尾插入分隔線和結尾押註
    const footerWithSeparator = `\n\n＿＿＿\n\n${template}`;
    const insertedContent = content + footerWithSeparator;
    
    return {
      content: insertedContent,
      rule: `應用結尾押註：${disclaimerType}`
    };
  }
  
  /**
   * 添加 TG Banner 和相關閱讀區塊
   */
  private addTelegramBannerAndRelatedArticles(content: string): string {
    const tgBanner = '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>';
    
    const relatedArticles = `<h5>📍相關報導📍</h5>
<strong><span style="color: #ff0000;"><a href="https://www.blocktempo.com/sample-article-1/">範例相關文章標題一</a></span></strong>

<strong><span style="color: #ff0000;"><a href="https://www.blocktempo.com/sample-article-2/">範例相關文章標題二</a></span></strong>

<strong><span style="color: #ff0000;"><a href="https://www.blocktempo.com/sample-article-3/">範例相關文章標題三</a></span></strong>`;
    
    return `${content}\n\n${tgBanner}\n\n${relatedArticles}`;
  }
  
  /**
   * 獲取押註模板
   */
  private getDisclaimerTemplates() {
    return {
      sponsored: {
        header: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
        footer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>'
      },
      'press-release': {
        header: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
        footer: null
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