import { NextRequest, NextResponse } from 'next/server';
import { uploadJsonToR2, getJsonFromR2 } from '@/services/storage/r2Service';
import { DEFAULT_AI_CONFIG } from '@/types/ai-config';

type AgentName = 'contentAgent' | 'prWriterAgent' | 'copyEditorAgent' | 'imageGeneration';

interface Params {
  agentName: string;
}

// 獲取單個 Agent 配置
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { agentName } = await params;
  
  if (!isValidAgentName(agentName)) {
    return NextResponse.json({
      success: false,
      error: '無效的 Agent 名稱'
    }, { status: 400 });
  }

  try {
    const agentConfig = await getJsonFromR2(`config/agents/${agentName}.json`);
    
    return NextResponse.json({
      success: true,
      data: agentConfig
    });
  } catch {
    console.log(`Agent ${agentName} not found, returning default`);
    
    // 如果找不到，返回預設配置
    const defaultConfig = DEFAULT_AI_CONFIG[agentName as AgentName];
    return NextResponse.json({
      success: true,
      data: defaultConfig
    });
  }
}

// 保存單個 Agent 配置
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { agentName } = await params;
  
  if (!isValidAgentName(agentName)) {
    return NextResponse.json({
      success: false,
      error: '無效的 Agent 名稱'
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { config } = body;
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: '缺少配置數據'
      }, { status: 400 });
    }

    // 驗證配置格式
    if (!isValidAgentConfig(agentName as AgentName, config)) {
      return NextResponse.json({
        success: false,
        error: '無效的配置格式'
      }, { status: 400 });
    }

    // 上傳配置到 R2
    await uploadJsonToR2(config, `config/agents/${agentName}.json`);
    
    // 更新 lastUpdated 元數據
    const metadata = { lastUpdated: new Date().toISOString() };
    await uploadJsonToR2(metadata, 'config/metadata/last-updated.json');
    
    return NextResponse.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    console.error(`保存 Agent ${agentName} 配置失敗:`, error);
    
    return NextResponse.json({
      success: false,
      error: '保存配置失敗'
    }, { status: 500 });
  }
}

// 重設單個 Agent 配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { agentName } = await params;
  
  if (!isValidAgentName(agentName)) {
    return NextResponse.json({
      success: false,
      error: '無效的 Agent 名稱'
    }, { status: 400 });
  }

  try {
    // 獲取預設配置
    const defaultConfig = DEFAULT_AI_CONFIG[agentName as AgentName];
    
    // 上傳預設配置到 R2（覆蓋現有配置）
    await uploadJsonToR2(defaultConfig, `config/agents/${agentName}.json`);
    
    // 更新 lastUpdated 元數據
    const metadata = { lastUpdated: new Date().toISOString() };
    await uploadJsonToR2(metadata, 'config/metadata/last-updated.json');
    
    return NextResponse.json({
      success: true,
      data: defaultConfig
    });
    
  } catch (error) {
    console.error(`重設 Agent ${agentName} 配置失敗:`, error);
    
    return NextResponse.json({
      success: false,
      error: '重設配置失敗'
    }, { status: 500 });
  }
}

// 驗證 Agent 名稱
function isValidAgentName(agentName: string): boolean {
  const validNames: AgentName[] = ['contentAgent', 'prWriterAgent', 'copyEditorAgent', 'imageGeneration'];
  return validNames.includes(agentName as AgentName);
}

// 驗證 Agent 配置
function isValidAgentConfig(agentName: AgentName, config: unknown): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const configObj = config as Record<string, unknown>;
  
  // 基本必需欄位
  if (!configObj.provider || !configObj.model) {
    return false;
  }
  
  // 根據 Agent 類型進行具體驗證
  if (agentName === 'imageGeneration') {
    // 圖片 Agent 驗證
    return typeof configObj.size === 'string' && 
           ['standard', 'medium', 'hd'].includes(configObj.quality as string) &&
           typeof configObj.promptTemplate === 'string';
  } else {
    // 文本 Agent 驗證
    return typeof configObj.temperature === 'number' &&
           typeof configObj.maxTokens === 'number' &&
           typeof configObj.topP === 'number' &&
           typeof configObj.systemPrompt === 'string' &&
           typeof configObj.userPrompt === 'string';
  }
} 