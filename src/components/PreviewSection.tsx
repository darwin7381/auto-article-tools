'use client';

import { Card, CardHeader, CardBody } from '@heroui/react';
import { Tabs, Tab } from '@heroui/react';
import { Divider } from '@heroui/react';

export default function PreviewSection() {
  // 模擬預覽數據
  const previewData = {
    title: '尚未上傳文件',
    content: '請先上傳文件或提供連結以查看預覽。',
    metadata: {
      wordCount: 0,
      imageCount: 0,
      estimatedReadTime: '0 分鐘',
    }
  };

  return (
    <section id="preview-section">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">內容預覽</h2>
          <p className="text-gray-500 dark:text-gray-400">預覽處理後的文章內容</p>
        </CardHeader>
        <CardBody>
          <Tabs 
            aria-label="預覽選項" 
            color="primary"
            variant="underlined"
            classNames={{
              tabList: "bg-gray-50 dark:bg-gray-900/30 p-2 rounded-large",
              cursor: "bg-primary-500",
              tab: "data-[selected=true]:text-primary-600 dark:data-[selected=true]:text-primary-400"
            }}
          >
            <Tab key="content" title="內容預覽">
              <div className="p-4 space-y-4 mt-4 bg-gray-50 dark:bg-gray-900/30 rounded-large">
                <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400">{previewData.title}</h3>
                <Divider className="bg-gray-200 dark:bg-gray-700" />
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="bg-white dark:bg-gray-800/50 p-4 rounded-medium">{previewData.content}</p>
                </div>
              </div>
            </Tab>
            <Tab key="metadata" title="元數據">
              <div className="p-4 mt-4 bg-gray-50 dark:bg-gray-900/30 rounded-large">
                <ul className="space-y-3 divide-y divide-gray-200 dark:divide-gray-700">
                  <li className="flex items-center pt-2">
                    <span className="font-medium w-36 text-primary-600 dark:text-primary-400">字數:</span>
                    <span className="bg-white dark:bg-gray-800 py-1 px-3 rounded-full text-sm">{previewData.metadata.wordCount}</span>
                  </li>
                  <li className="flex items-center pt-3">
                    <span className="font-medium w-36 text-primary-600 dark:text-primary-400">圖片數:</span>
                    <span className="bg-white dark:bg-gray-800 py-1 px-3 rounded-full text-sm">{previewData.metadata.imageCount}</span>
                  </li>
                  <li className="flex items-center pt-3">
                    <span className="font-medium w-36 text-primary-600 dark:text-primary-400">預估閱讀時間:</span>
                    <span className="bg-white dark:bg-gray-800 py-1 px-3 rounded-full text-sm">{previewData.metadata.estimatedReadTime}</span>
                  </li>
                </ul>
              </div>
            </Tab>
            <Tab key="html" title="HTML">
              <div className="p-4 mt-4">
                <div className="bg-gray-800 p-4 rounded-large overflow-auto text-sm">
                  <code className="text-sm whitespace-pre-wrap text-gray-100 font-mono">
                    &lt;p&gt;{previewData.content}&lt;/p&gt;
                  </code>
                </div>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </section>
  );
} 