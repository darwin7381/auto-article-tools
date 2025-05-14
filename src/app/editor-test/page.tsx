'use client';

import { useState } from 'react';
import TapEditor from '@/components/ui/taptip-editor';

export default function EditorTestPage() {
  const [content, setContent] = useState('<p>這是初始內容，您可以編輯它</p>');
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">TipTap 編輯器測試頁面</h1>
      
      <div className="mb-6">
        <TapEditor 
          initialContent={content}
          onChange={(newContent) => {
            setContent(newContent);
            console.log('內容已更新:', newContent);
          }}
          placeholder="開始編輯..."
        />
      </div>
      
      <div className="mt-8 border-t pt-4">
        <h2 className="text-xl font-bold mb-2">當前編輯器 HTML 內容：</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
          {content}
        </pre>
      </div>
    </div>
  );
} 