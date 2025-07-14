'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Card } from '@/components/ui/card/Card';
import { TextAgentConfig, ImageAgentConfig, AIConfig, AIProvider } from '@/types/ai-config';
import { SUPPORTED_MODELS } from '@/types/ai-config';

interface AIConfigManagerProps {
  className?: string;
  showTitle?: boolean;
}

export default function AIConfigManager({ 
  className = "",
  showTitle = true 
}: AIConfigManagerProps) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentStates, setAgentStates] = useState<Record<string, {
    saving: boolean;
    error: string | null;
    success: string | null;
  }>>({
    contentAgent: { saving: false, error: null, success: null },
    prWriterAgent: { saving: false, error: null, success: null },
    copyEditorAgent: { saving: false, error: null, success: null },
    imageGeneration: { saving: false, error: null, success: null },
  });
  const [error, setError] = useState<string | null>(null);

  // 載入配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/config/ai');
      const data: AIConfig = await response.json();
      
      if (data) {
        setConfig(data);
      } else {
        setError('載入配置失敗');
      }
    } catch (err) {
      setError('載入配置時發生錯誤');
      console.error('載入配置錯誤:', err);
    } finally {
      setLoading(false);
    }
  };



  // 更新單個 Agent 狀態
  const updateAgentState = (agentName: string, updates: Partial<{
    saving: boolean;
    error: string | null;
    success: string | null;
  }>) => {
    setAgentStates(prev => ({
      ...prev,
      [agentName]: { ...prev[agentName], ...updates }
    }));
  };

  // 保存單個 Agent 配置
  const saveAgentConfig = async (agentName: string) => {
    if (!config) return;
    
    try {
      // 驗證溫度參數
      const agentConfig = config[agentName as keyof AIConfig];
      if (typeof agentConfig === 'object' && agentConfig !== null && 'temperature' in agentConfig) {
        const tempValue = (agentConfig as TextAgentConfig).temperature;
        const temp = parseFloat(String(tempValue));
        if (isNaN(temp) || temp < 0 || temp > 2) {
          setAgentStates(prev => ({
            ...prev,
            [agentName]: {
              ...prev[agentName],
              error: '溫度參數必須是 0-2 之間的數字',
              success: null
            }
          }));
          return;
        }
        // 將溫度轉換為數字
        (agentConfig as TextAgentConfig).temperature = temp;
      }

      setAgentStates(prev => ({
        ...prev,
        [agentName]: { ...prev[agentName], saving: true, error: null, success: null }
      }));
      
      const response = await fetch(`/api/config/ai/agents/${agentName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: agentConfig }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAgentStates(prev => ({
          ...prev,
          [agentName]: {
            ...prev[agentName],
            saving: false,
            success: `${agentName} 配置保存成功！`,
            error: null
          }
        }));
        // 更新本地配置的 lastUpdated
        setConfig(prev => prev ? {
          ...prev,
          lastUpdated: new Date().toISOString()
        } : null);
        // 3秒後清除成功消息
        setTimeout(() => {
          setAgentStates(prev => ({
            ...prev,
            [agentName]: { ...prev[agentName], success: null }
          }));
        }, 3000);
      } else {
        setAgentStates(prev => ({
          ...prev,
          [agentName]: {
            ...prev[agentName],
            saving: false,
            error: data.error || `保存 ${agentName} 配置失敗`,
            success: null
          }
        }));
      }
    } catch (err) {
      setAgentStates(prev => ({
        ...prev,
        [agentName]: {
          ...prev[agentName],
          saving: false,
          error: `保存 ${agentName} 配置時發生錯誤`,
          success: null
        }
      }));
      console.error(`保存 ${agentName} 配置錯誤:`, err);
    }
  };

  // 重新載入單個 Agent 配置
  const reloadAgentConfig = async (agentName: string) => {
    if (!config) return;
    
    try {
      updateAgentState(agentName, { saving: true, error: null, success: null });
      
      const response = await fetch(`/api/config/ai/agents/${agentName}`);
      const data = await response.json();
      
      if (data.success) {
        // 更新本地配置中的該 Agent
        setConfig(prev => prev ? {
          ...prev,
          [agentName]: data.data,
          lastUpdated: new Date().toISOString()
        } : null);
        updateAgentState(agentName, { success: `配置重新載入成功！` });
        setTimeout(() => updateAgentState(agentName, { success: null }), 3000);
      } else {
        updateAgentState(agentName, { error: data.error || `重新載入配置失敗` });
      }
    } catch (err) {
      updateAgentState(agentName, { error: `重新載入配置時發生錯誤` });
      console.error(`重新載入 ${agentName} 配置錯誤:`, err);
    } finally {
      updateAgentState(agentName, { saving: false });
    }
  };

  // 重置單個 Agent 配置為預設值
  const resetAgentConfig = async (agentName: string) => {
    if (!config) return;
    
    try {
      updateAgentState(agentName, { saving: true, error: null, success: null });
      
      const response = await fetch(`/api/config/ai/agents/${agentName}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地配置中的該 Agent
        setConfig(prev => prev ? {
          ...prev,
          [agentName]: data.data,
          lastUpdated: new Date().toISOString()
        } : null);
        updateAgentState(agentName, { success: `配置重置成功！` });
        setTimeout(() => updateAgentState(agentName, { success: null }), 3000);
      } else {
        updateAgentState(agentName, { error: data.error || `重置配置失敗` });
      }
    } catch (err) {
      updateAgentState(agentName, { error: `重置配置時發生錯誤` });
      console.error(`重置 ${agentName} 配置錯誤:`, err);
    } finally {
      updateAgentState(agentName, { saving: false });
    }
  };



  const updateTextAgentConfig = (agentName: 'contentAgent' | 'prWriterAgent' | 'copyEditorAgent', updates: Partial<TextAgentConfig>) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [agentName]: {
        ...config[agentName],
        ...updates
      }
    });
  };

  const updateImageAgentConfig = (updates: Partial<ImageAgentConfig>) => {
    if (!config) return;
    
    setConfig({
      ...config,
      imageGeneration: {
        ...config.imageGeneration,
        ...updates
      }
    });
  };

  if (loading) {
    return (
      <div className={`bg-background border border-divider rounded-xl shadow ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">載入配置中...</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`bg-background border border-divider rounded-xl shadow p-6 ${className}`}>
        <div className="text-center">
          {showTitle && <h1 className="text-2xl font-bold mb-4 text-foreground">AI 配置管理</h1>}
          <div className="text-red-500 mb-4">{error}</div>
          <Button onClick={loadConfig}>重新載入</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background border border-divider rounded-xl shadow ${className}`}>
      {/* 標題區域 */}
      {showTitle && (
        <div className="p-6 border-b border-divider">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">AI 處理步驟配置</h1>
              <p className="text-foreground/70">管理各個處理步驟的 AI 提供商、模型和提示詞設定（分離存儲架構）</p>
            </div>
          </div>
        </div>
      )}

      {/* 內容區域 */}
      <div className="p-6">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
            ❌ {error}
          </div>
        )}

        {/* 配置區塊 */}
        <div className="space-y-6">
          {/* 步驟3: AI初步內容處理 */}
          <TextAgentSection
            title="步驟3: AI初步內容處理 (contentAgent)"
            description="將來源內容轉換為台灣繁體中文專業新聞稿"
            config={config?.contentAgent}
            onUpdate={(updates) => updateTextAgentConfig('contentAgent', updates)}
            onSave={() => saveAgentConfig('contentAgent')}
            onReset={() => resetAgentConfig('contentAgent')}
            onReload={() => reloadAgentConfig('contentAgent')}
            agentState={agentStates.contentAgent}
          />

          {/* 步驟4: 高級AI處理 */}
          <TextAgentSection
            title="步驟4: 高級AI處理 (prWriterAgent)"
            description="進一步優化內容為專業PR新聞稿格式"
            config={config?.prWriterAgent}
            onUpdate={(updates) => updateTextAgentConfig('prWriterAgent', updates)}
            onSave={() => saveAgentConfig('prWriterAgent')}
            onReset={() => resetAgentConfig('prWriterAgent')}
            onReload={() => reloadAgentConfig('prWriterAgent')}
            agentState={agentStates.prWriterAgent}
          />

          {/* 步驟6: 文稿編輯 */}
          <TextAgentSection
            title="步驟6: 文稿編輯與WordPress參數生成 (copyEditorAgent)"
            description="生成WordPress發布參數和適配內容格式"
            config={config?.copyEditorAgent}
            onUpdate={(updates) => updateTextAgentConfig('copyEditorAgent', updates)}
            onSave={() => saveAgentConfig('copyEditorAgent')}
            onReset={() => resetAgentConfig('copyEditorAgent')}
            onReload={() => reloadAgentConfig('copyEditorAgent')}
            agentState={agentStates.copyEditorAgent}
          />

          {/* 步驟7: 封面圖生成 */}
          <ImageAgentSection
            title="步驟7: 封面圖生成 (imageGeneration)"
            description="根據文章內容生成適合的封面圖"
            config={config?.imageGeneration}
            onUpdate={updateImageAgentConfig}
            onSave={() => saveAgentConfig('imageGeneration')}
            onReset={() => resetAgentConfig('imageGeneration')}
            onReload={() => reloadAgentConfig('imageGeneration')}
            agentState={agentStates.imageGeneration}
          />
        </div>

        {/* 配置信息 */}
        <div className="mt-6 text-sm text-foreground/60 text-center">
          最後更新時間：{config?.lastUpdated ? new Date(config.lastUpdated).toLocaleString('zh-TW') : '載入中...'}
        </div>
      </div>
    </div>
  );
}

// 文本 Agent 配置組件
function TextAgentSection({
  title,
  description,
  config,
  onUpdate,
  onSave,
  onReset,
  onReload,
  agentState
}: {
  title: string;
  description: string;
  config?: TextAgentConfig;
  onUpdate: (updates: Partial<TextAgentConfig>) => void;
  onSave: () => void;
  onReset: () => void;
  onReload: () => void;
  agentState: { saving: boolean; error: string | null; success: string | null };
}) {
  // 根據代理類型決定代數說明
  const getVariableInfo = (title: string) => {
    if (title.includes('contentAgent')) {
      return '可用代數：• ${markdownContent} - 要處理的Markdown內容';
    } else if (title.includes('prWriterAgent')) {
      return '可用代數：• ${markdownContent} - 要處理的Markdown內容';
    } else if (title.includes('copyEditorAgent')) {
      return '可用代數：• ${content} - 要處理的HTML或Markdown內容（實際Agent會根據contentType動態調整系統提示詞）';
    }
    return '可用代數：• ${content} - 要處理的內容';
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [customModel, setCustomModel] = useState(config?.model || '');
  const [showCustomModel, setShowCustomModel] = useState(
    config?.model === 'custom' || 
    !SUPPORTED_MODELS[config?.provider || 'openai']?.text.some((model: string) => model === config?.model)
  );

  // 如果config為undefined，顯示載入中狀態
  if (!config) {
    return (
      <Card className="bg-background border border-divider">
        <div className="p-6 flex justify-center items-center">
          <div className="text-foreground/60">載入配置中...</div>
        </div>
      </Card>
    );
  }

  const handleModelChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomModel(true);
      setCustomModel(config?.model === 'custom' ? '' : config?.model || '');
    } else {
      setShowCustomModel(false);
      setCustomModel('');
      onUpdate({ model: value });
    }
  };

  const handleCustomModelChange = (value: string) => {
    setCustomModel(value);
    onUpdate({ model: value });
  };

  return (
    <Card className="bg-background border border-divider">
      {/* 固定顯示的標題區域 */}
      <div 
        className="p-6 flex justify-between items-start cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono text-foreground/60 select-none">
              {isExpanded ? '▼' : '▶'}
            </span>
            <h3 className="text-lg font-medium">
              {title.replace(/\([^)]*\)/, '')}
              <span className="text-foreground/60">(</span>
              <span className="text-blue-600 dark:text-blue-400">{title.match(/\(([^)]*)\)/)?.[1]}</span>
              <span className="text-foreground/60">)</span>
            </h3>
          </div>
          <p className="text-sm text-foreground/60 mt-1">{description}</p>
        </div>
        <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onReset}
            disabled={agentState.saving}
            title="重置為預設配置"
            className="border border-divider hover:bg-foreground/5 text-foreground px-3 py-2 text-sm rounded"
          >
            🔄 重置預設
          </button>
          <button
            onClick={onReload}
            disabled={agentState.saving}
            title="從R2重新載入配置"
            className="border border-divider hover:bg-foreground/5 text-foreground px-3 py-2 text-sm rounded"
          >
            📥 重新載入
          </button>
          <button
            onClick={onSave}
            disabled={agentState.saving}
            title="儲存此配置到R2"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded"
          >
            {agentState.saving ? '⏳ 儲存中...' : '💾 儲存'}
          </button>
        </div>
      </div>

      {/* 狀態訊息 */}
      {agentState.error && (
        <div className="mx-6 mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
          ❌ {agentState.error}
        </div>
      )}
      {agentState.success && (
        <div className="mx-6 mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded text-sm">
          ✅ {agentState.success}
        </div>
      )}

      {/* 可展開的配置區域 */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-divider/40">
          <div className="pt-6 space-y-6">
            {/* 基本配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  提供商
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => onUpdate({ provider: e.target.value as AIProvider })}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="選擇AI提供商"
                  title="選擇AI提供商"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="grok">Grok</option>
                  <option value="claude">Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  模型
                </label>
                <select
                  value={showCustomModel ? 'custom' : config.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="選擇AI模型"
                  title="選擇AI模型"
                >
                  {SUPPORTED_MODELS[config.provider]?.text.map((model) => (
                    <option key={model} value={model}>
                      {model === 'custom' ? '自訂模型 (Custom)' : model}
                    </option>
                  ))}
                </select>
                {showCustomModel && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => handleCustomModelChange(e.target.value)}
                    placeholder="輸入自訂模型ID"
                    title="輸入自訂模型ID"
                    aria-label="自訂模型ID"
                    className="w-full mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  溫度
                </label>
                <input
                  type="text"
                  value={config.temperature}
                  onChange={(e) => onUpdate({ temperature: e.target.value as unknown as number })}
                  placeholder="0.0 - 1.0"
                  title="設定溫度參數 (0.0 - 1.0)"
                  aria-label="溫度參數"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  最大Token
                </label>
                <input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || 1000 })}
                  title="設定最大Token數量"
                  aria-label="最大Token數量"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Top-P
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={config.topP}
                onChange={(e) => onUpdate({ topP: parseFloat(e.target.value) || 0.95 })}
                title="設定Top-P參數 (0-1)"
                aria-label="Top-P參數"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 系統提示詞 */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                系統提示詞
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                可用代數：無 - 系統提示詞不支援動態代數
              </p>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                placeholder="輸入系統提示詞..."
              />
            </div>

            {/* 用戶提示詞 */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                用戶提示詞
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                {getVariableInfo(title)}
              </p>
              <textarea
                value={config.userPrompt}
                onChange={(e) => onUpdate({ userPrompt: e.target.value })}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="輸入用戶提示詞..."
              />
            </div>
          </div>
        </div>
      )}
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
  onReset,
  onReload,
  agentState
}: {
  title: string;
  description: string;
  config?: ImageAgentConfig;
  onUpdate: (updates: Partial<ImageAgentConfig>) => void;
  onSave: () => void;
  onReset: () => void;
  onReload: () => void;
  agentState: { saving: boolean; error: string | null; success: string | null };
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customModel, setCustomModel] = useState(config?.model || '');
  const [showCustomModel, setShowCustomModel] = useState(
    config?.model === 'custom' || 
    !SUPPORTED_MODELS[config?.provider || 'openai']?.image.some((model: string) => model === config?.model)
  );

  // 如果config為undefined，顯示載入中狀態
  if (!config) {
    return (
      <Card className="bg-background border border-divider">
        <div className="p-6 flex justify-center items-center">
          <div className="text-foreground/60">載入配置中...</div>
        </div>
      </Card>
    );
  }

  const handleModelChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomModel(true);
      setCustomModel(config?.model === 'custom' ? '' : config?.model || '');
    } else {
      setShowCustomModel(false);
      setCustomModel('');
      onUpdate({ model: value });
    }
  };

  const handleCustomModelChange = (value: string) => {
    setCustomModel(value);
    onUpdate({ model: value });
  };

  return (
    <Card className="bg-background border border-divider">
      {/* 固定顯示的標題區域 */}
      <div 
        className="p-6 flex justify-between items-start cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono text-foreground/60 select-none">
              {isExpanded ? '▼' : '▶'}
            </span>
            <h3 className="text-lg font-medium">
              {title.replace(/\([^)]*\)/, '')}
              <span className="text-foreground/60">(</span>
              <span className="text-blue-600 dark:text-blue-400">{title.match(/\(([^)]*)\)/)?.[1]}</span>
              <span className="text-foreground/60">)</span>
            </h3>
          </div>
          <p className="text-sm text-foreground/60 mt-1">{description}</p>
        </div>
        <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onReset}
            disabled={agentState.saving}
            title="重置為預設配置"
            className="border border-divider hover:bg-foreground/5 text-foreground px-3 py-2 text-sm rounded"
          >
            🔄 重置預設
          </button>
          <button
            onClick={onReload}
            disabled={agentState.saving}
            title="從R2重新載入配置"
            className="border border-divider hover:bg-foreground/5 text-foreground px-3 py-2 text-sm rounded"
          >
            📥 重新載入
          </button>
          <button
            onClick={onSave}
            disabled={agentState.saving}
            title="儲存此配置到R2"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded"
          >
            {agentState.saving ? '⏳ 儲存中...' : '💾 儲存'}
          </button>
        </div>
      </div>

      {/* 狀態訊息 */}
      {agentState.error && (
        <div className="mx-6 mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
          ❌ {agentState.error}
        </div>
      )}
      {agentState.success && (
        <div className="mx-6 mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded text-sm">
          ✅ {agentState.success}
        </div>
      )}

      {/* 可展開的配置區域 */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-divider/40">
          <div className="pt-6 space-y-6">
            {/* 基本配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  提供商
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => onUpdate({ provider: e.target.value as AIProvider })}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="選擇AI提供商"
                  title="選擇AI提供商"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="grok">Grok</option>
                  <option value="claude">Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  模型
                </label>
                <select
                  value={showCustomModel ? 'custom' : config.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="選擇AI模型"
                  title="選擇AI模型"
                >
                  {SUPPORTED_MODELS[config.provider]?.image.map((model) => (
                    <option key={model} value={model}>
                      {model === 'custom' ? '自訂模型 (Custom)' : model}
                    </option>
                  ))}
                </select>
                {showCustomModel && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => handleCustomModelChange(e.target.value)}
                    placeholder="輸入自訂模型ID"
                    title="輸入自訂模型ID"
                    aria-label="自訂模型ID"
                    className="w-full mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  圖片尺寸
                </label>
                <input
                  type="text"
                  value={config.size}
                  onChange={(e) => onUpdate({ size: e.target.value })}
                  placeholder="如: 1536x1024"
                  title="設定圖片尺寸"
                  aria-label="圖片尺寸"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                品質
              </label>
              <select
                value={config.quality}
                onChange={(e) => onUpdate({ quality: e.target.value as 'standard' | 'medium' | 'hd' })}
                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="選擇圖片品質"
                title="選擇圖片品質"
              >
                <option value="standard">標準</option>
                <option value="medium">中等</option>
                <option value="hd">高畫質</option>
              </select>
            </div>

            {/* 圖片生成提示詞模板 */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                圖片生成提示詞模板
              </label>
              <p className="text-xs text-foreground/60 mb-2">
                可用代數：• ${'${title}'} - 文章標題, ${'${contentSummary}'} - 內容摘要, ${'${articleType}'} - 文章類型
              </p>
              <textarea
                value={config.promptTemplate}
                onChange={(e) => onUpdate({ promptTemplate: e.target.value })}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="輸入圖片生成提示詞模板..."
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 