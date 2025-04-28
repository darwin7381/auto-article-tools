import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params;
    
    if (!fileName) {
      return NextResponse.json(
        { error: '未提供文件名稱' },
        { status: 400 }
      );
    }
    
    console.log(`嘗試獲取 Markdown 文件: ${fileName}`);
    
    // 在臨時目錄中尋找文件
    const filePath = path.join('/tmp', 'processed-markdown', fileName);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return NextResponse.json(
        { error: '找不到文件' },
        { status: 404 }
      );
    }
    
    // 讀取文件內容
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // 返回文件內容
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=86400', // 緩存一天
      },
    });
  } catch (error) {
    console.error('獲取 Markdown 文件時出錯:', error);
    return NextResponse.json(
      { error: '處理請求時出錯' },
      { status: 500 }
    );
  }
} 