'use client';

import { Card, CardHeader, CardBody } from '@heroui/card';
import { Accordion, AccordionItem } from '@heroui/accordion';

export default function FeaturesSection() {
  const features = [
    {
      title: '多格式支持',
      description: '支持處理 PDF、DOCX 文件，以及從多種來源如 Google Docs、Medium、WeChat 等網站提取內容。'
    },
    {
      title: '內容格式保留',
      description: '自動保留原文檔格式，包括標題、段落、列表、表格和圖片，確保內容完整性。'
    },
    {
      title: '智能元數據提取',
      description: '自動提取文章標題、字數、圖片數量等元數據，便於分類和管理。'
    },
    {
      title: 'WordPress 一鍵發布',
      description: '支持直接發布到 WordPress 網站，可設置文章分類、標籤和發布狀態。'
    },
    {
      title: '批次處理功能',
      description: '支持批次處理多個文件或連結，提高內容處理效率。'
    }
  ];

  return (
    <section id="features-section">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">功能介紹</h2>
          <p className="text-gray-500 dark:text-gray-400">了解系統支持的主要功能</p>
        </CardHeader>
        <CardBody>
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-large p-4">
            <Accordion 
              variant="splitted" 
              className="gap-2" 
              selectionMode="multiple"
            >
              {features.map((feature, index) => (
                <AccordionItem 
                  key={index} 
                  textValue={feature.title}
                  title={
                    <div className="flex items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mr-3">
                        {index + 1}
                      </div>
                      <span className="text-primary-600 dark:text-primary-400 font-medium">{feature.title}</span>
                    </div>
                  }
                  className="bg-white dark:bg-gray-800 mb-2 rounded-medium shadow-sm overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    <p className="text-gray-600 dark:text-gray-300 py-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </CardBody>
      </Card>
    </section>
  );
} 