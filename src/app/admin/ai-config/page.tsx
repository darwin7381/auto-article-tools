'use client';

import AppHeader from '@/components/AppHeader';
import AIConfigManager from '@/components/admin/AIConfigManager';

export default function AIConfigPage() {
  return (
    <>
      <AppHeader 
        title="AI 配置管理"
        subtitle="管理各個處理步驟的 AI 提供商、模型和提示詞設定"
      />
      
      <div className="container mx-auto px-4 pt-32 pb-8 max-w-7xl">
        <AIConfigManager className="w-full" />
      </div>
    </>
  );
} 