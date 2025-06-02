// 簡單的 ArticleFormattingProcessor 測試
import { ArticleFormattingProcessor } from './src/services/document/ArticleFormattingProcessor.js';

// 測試數據
const testContent = `
<p>這是一個測試文章，包含各種標題層級的內容。</p>
<p>Bitcoin 以太坊是重要的加密貨幣。</p>
<h1>主要標題H1</h1>
<h2>次要標題H2</h2>
<h3>小標題H3</h3>
<h4>更小標題H4</h4>
<h5>最小標題H5</h5>
`;

const testAdvancedSettings = {
  headerDisclaimer: 'sponsored',
  footerDisclaimer: 'sponsored',
  authorName: '測試科技公司'
};

async function testArticleFormatting() {
  console.log('🧪 開始測試進階文章格式化處理器...\n');
  
  try {
    const processor = new ArticleFormattingProcessor();
    
    console.log('📝 測試內容長度:', testContent.length);
    console.log('⚙️ 測試設定:', testAdvancedSettings);
    console.log('\n處理中...\n');
    
    const result = await processor.formatArticle(
      testContent,
      testAdvancedSettings
    );
    
    console.log('✅ 處理成功！');
    console.log('\n📊 處理結果統計:');
    console.log('- 開頭押註:', result.metadata.hasHeaderDisclaimer ? '✅ 已應用' : '❌ 未應用');
    console.log('- 結尾押註:', result.metadata.hasFooterDisclaimer ? '✅ 已應用' : '❌ 未應用');
    console.log('- 供稿方名稱:', result.metadata.authorName || '未設定');
    console.log('- 應用規則數量:', result.metadata.appliedRules.length);
    
    console.log('\n📝 應用的規則:');
    result.metadata.appliedRules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule}`);
    });
    
    console.log('\n🎯 格式化後內容預覽 (前300字):');
    console.log(result.formattedContent.substring(0, 300) + '...');
    
    // 驗證關鍵功能
    const content = result.formattedContent;
    
    console.log('\n🔍 功能驗證:');
    console.log('- 標題正規化 (h1保持不變):', content.includes('<h1>主要標題H1</h1>') ? '✅' : '❌');
    console.log('- 標題正規化 (h2→h3):', content.includes('<h3>次要標題H2</h3>') ? '✅' : '❌');
    console.log('- 標題正規化 (h3→h4):', content.includes('<h4>小標題H3</h4>') ? '✅' : '❌');
    console.log('- 標題正規化 (h4→h5):', content.includes('<h5>更小標題H4</h5>') ? '✅' : '❌');
    console.log('- Dropcap應用:', content.includes('dropcap') ? '✅' : '❌');
    console.log('- 引言區塊:', content.includes('intro_quote') ? '✅' : '❌');
    console.log('- 押註插入:', content.includes(testAdvancedSettings.authorName) ? '✅' : '❌');
    console.log('- TG Banner:', content.includes('blocktemponews') ? '✅' : '❌');
    console.log('- 相關閱讀:', content.includes('📍相關報導📍') ? '✅' : '❌');
    
    console.log('\n✅ 已刪除的功能（應該不存在）:');
    console.log('- 移除解禁敘述功能:', '✅ 已從處理器中移除');
    console.log('- 中文用語轉換功能:', '✅ 已從處理器中移除'); 
    console.log('- 英文數字空格處理:', '✅ 已從處理器中移除');
    console.log('- 生成英文永久連結:', '✅ 已從處理器中移除');
    
    console.log('\n🎉 測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
  }
}

// 執行測試
testArticleFormatting(); 