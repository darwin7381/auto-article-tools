import { NextResponse } from 'next/server';
import { getJsonFromR2 } from '@/services/storage/r2Service';
import { DEFAULT_AI_CONFIG, AIConfig } from '@/types/ai-config';

type AgentName = 'contentAgent' | 'prWriterAgent' | 'copyEditorAgent' | 'imageGeneration';

// 獲取完整的 AI 配置
export async function GET() {
  try {
    const agents: AgentName[] = ['contentAgent', 'prWriterAgent', 'copyEditorAgent', 'imageGeneration'];
    const config: Partial<AIConfig> = {};
    
    // 並行獲取所有 Agent 配置
    const promises = agents.map(async (agentName) => {
      try {
        const agentConfig = await getJsonFromR2(`config/agents/${agentName}.json`);
        return { agentName, config: agentConfig };
      } catch {
        console.log(`Agent ${agentName} not found, using default`);
        // 如果找不到，使用預設配置
        return { agentName, config: DEFAULT_AI_CONFIG[agentName] };
      }
    });

    const results = await Promise.all(promises);
    
    // 組裝完整配置
    results.forEach(({ agentName, config: agentConfig }) => {
      (config as Record<string, unknown>)[agentName] = agentConfig;
    });

    // 獲取元數據
    let metadata: { lastUpdated: string };
    try {
      metadata = await getJsonFromR2<{ lastUpdated: string }>('config/metadata/last-updated.json');
    } catch {
      metadata = { lastUpdated: new Date().toISOString() };
    }

    const fullConfig: AIConfig = {
      ...config,
      lastUpdated: metadata.lastUpdated
    } as AIConfig;

    // 直接回傳配置，不需要包裝在 success/data 結構中
    return NextResponse.json(fullConfig);

  } catch (error) {
    console.error('獲取 AI 配置失敗:', error);
    
    // 如果完全失敗，返回預設配置
    return NextResponse.json(DEFAULT_AI_CONFIG);
  }
} 