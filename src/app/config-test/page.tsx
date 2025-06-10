'use client';

import { ConfigurationPanel } from '@/components/configuration/ConfigurationPanel';

export default function ConfigTestPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            配置管理測試
          </h1>
          <p className="text-gray-600">
            測試 Strapi CMS 整合 - 動態管理作者、文稿模板和 WordPress 設定
          </p>
        </div>

        <ConfigurationPanel />
      </div>
    </div>
  );
} 