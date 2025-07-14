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

// 文本 Agent 配置組件
function TextAgentSection({
  title,
  description,
  config,
  onUpdate,
  onSave,
  saving
}: {
  title: string;
  description: string;
  config: TextAgentConfig;
  onUpdate: (updates: Partial<TextAgentConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm"
        >
          {saving ? '保存中...' : '💾 保存此配置'}
        </Button>
      </div>

      <div className="space-y-4">
        {/* AI 配置 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">提供商</label>
            <select
              value={config.provider}
              onChange={(e) => onUpdate({ provider: e.target.value as 'openai' | 'gemini' | 'grok' | 'claude' })}
              className="w-full p-2 border rounded"
              aria-label="選擇AI提供商"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="grok">Grok</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">模型</label>
            <select
              value={config.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              className="w-full p-2 border rounded"
            >
              {SUPPORTED_MODELS[config.provider]?.text.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">溫度</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">最大Token</label>
            <Input
              type="number"
              min="1"
              max="100000"
              value={config.maxTokens}
              onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Top-P</label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={config.topP}
              onChange={(e) => onUpdate({ topP: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {/* 提示詞設定 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">系統提示詞</label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
              className="w-full p-3 border rounded h-32 font-mono text-sm"
              placeholder="輸入系統提示詞..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">用戶提示詞</label>
            <textarea
              value={config.userPrompt}
              onChange={(e) => onUpdate({ userPrompt: e.target.value })}
              className="w-full p-3 border rounded h-24 font-mono text-sm"
              placeholder="輸入用戶提示詞... (使用 {content} 代表文章內容)"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// 圖片 Agent 配置組件
function ImageAgentSection({
  title,
  description,
  config,
  onUpdate,
  onSave,
  saving
}: {
  title: string;
  description: string;
  config: ImageAgentConfig;
  onUpdate: (updates: Partial<ImageAgentConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm"
        >
          {saving ? '保存中...' : '💾 保存此配置'}
        </Button>
      </div>

      <div className="space-y-4">
        {/* AI 配置 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">提供商</label>
            <select
              value={config.provider}
              onChange={(e) => onUpdate({ provider: e.target.value as any })}
              className="w-full p-2 border rounded"
            >
              <option value="openai">OpenAI</option>
              <option value="midjourney">Midjourney</option>
              <option value="stable-diffusion">Stable Diffusion</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">模型</label>
            <Input
              value={config.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
              placeholder="模型名稱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">圖片尺寸</label>
            <Input
              value={config.size}
              onChange={(e) => onUpdate({ size: e.target.value })}
              placeholder="1536x1024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">品質</label>
            <select
              value={config.quality}
              onChange={(e) => onUpdate({ quality: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="standard">標準</option>
              <option value="hd">高清</option>
            </select>
          </div>
        </div>

        {/* 提示詞模板 */}
        <div>
          <label className="block text-sm font-medium mb-1">
            圖片生成提示詞模板
            <span className="text-gray-500 text-xs ml-2">
              (使用 {`{title}, {content}, {articleType}`} 代表文章信息)
            </span>
          </label>
          <textarea
            value={config.promptTemplate}
            onChange={(e) => onUpdate({ promptTemplate: e.target.value })}
            className="w-full p-3 border rounded h-32 font-mono text-sm"
            placeholder="輸入圖片生成提示詞模板..."
          />
        </div>
      </div>
    </Card>
  );
} 