'use client';

import React from 'react';
import EditorIntegration from '@/components/ui/editor-integration';

interface PrepPublishingComponentProps {
  fileId: string, 
  htmlContent?: string,
  markdownUrl?: string, 
  onContentChange?: (content: string) => void,
  onContinue?: () => void  // 繼續處理的回調函數
}

export default function PrepPublishingComponent({
  fileId,
  htmlContent,
  markdownUrl,
  onContentChange,
  onContinue
}: PrepPublishingComponentProps) {
  return (
    <div className="mt-2 pl-8 pr-0">
      <EditorIntegration 
        fileId={fileId}
        initialHtml={htmlContent || ''}
        markdownUrl={markdownUrl}
        onContentSave={onContentChange}
        onContinue={onContinue} // 傳遞繼續處理回調
      />
    </div>
  );
} 