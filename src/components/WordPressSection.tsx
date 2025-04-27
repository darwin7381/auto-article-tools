'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Button } from '@heroui/react';
import { Checkbox } from '@heroui/react';
import { Select, SelectItem } from '@heroui/react';
import { Chip } from '@heroui/react';

export default function WordPressSection() {
  const [wpUrl, setWpUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模擬分類選項，實際應從WordPress API獲取
  const categoryOptions = [
    { id: '1', name: '新聞' },
    { id: '2', name: '科技' },
    { id: '3', name: '區塊鏈' },
    { id: '4', name: '教學' },
  ];

  const handlePublish = () => {
    console.log('發布到WordPress', {
      wpUrl,
      username,
      categories,
      autoPublish
    });
    // 實際發布邏輯將在後續階段實現
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    handlePublish();
    setIsSubmitting(false);
  };

  const canSubmit = !isSubmitting && !wpUrl || !username || !password || categories.length === 0;

  return (
    <section id="wordpress-section" className="w-full">
      <Card className="border-none shadow-none">
        <CardHeader className="flex flex-col gap-1.5 pb-0">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">WordPress 發布設定</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">配置WordPress發布選項</p>
        </CardHeader>
        
        <CardBody className="pt-6">
          <div className="space-y-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-600 dark:text-blue-400">
                    <path d="M12 0c6.6 0 12 5.4 12 12s-5.4 12-12 12S0 18.6 0 12 5.4 0 12 0zm0 2.5c-5.2 0-9.5 4.3-9.5 9.5s4.3 9.5 9.5 9.5 9.5-4.3 9.5-9.5-4.3-9.5-9.5-9.5zM9 16.5h6c.8 0 1.5-.7 1.5-1.5v-6c0-.8-.7-1.5-1.5-1.5H9c-.8 0-1.5.7-1.5 1.5v6c0 .8.7 1.5 1.5 1.5zm1.5-6h3v3h-3v-3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300">WordPress 連接資訊</h3>
                </div>
                
                <Input
                  type="url"
                  label="WordPress 網址"
                  placeholder="https://your-site.com"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  variant="bordered"
                  color="primary"
                  radius="lg"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  }
                  classNames={{
                    label: "text-primary-600 dark:text-primary-400 font-medium",
                    inputWrapper: [
                      "shadow-sm",
                      "bg-white dark:bg-gray-800",
                      "hover:bg-white dark:hover:bg-gray-800",
                      "group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-gray-800"
                    ]
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  type="text"
                  label="使用者名稱"
                  placeholder="管理員帳號"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  variant="bordered"
                  color="primary"
                  radius="lg"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  }
                  classNames={{
                    label: "text-primary-600 dark:text-primary-400 font-medium",
                    inputWrapper: [
                      "shadow-sm",
                      "bg-white dark:bg-gray-800",
                      "hover:bg-white dark:hover:bg-gray-800",
                      "group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-gray-800"
                    ]
                  }}
                />
                
                <Input
                  type="password"
                  label="應用程式密碼"
                  placeholder="WordPress 應用程式密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="bordered"
                  color="primary"
                  radius="lg"
                  labelPlacement="outside"
                  description="請使用應用程式密碼而非登入密碼"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  }
                  classNames={{
                    label: "text-primary-600 dark:text-primary-400 font-medium",
                    inputWrapper: [
                      "shadow-sm",
                      "bg-white dark:bg-gray-800",
                      "hover:bg-white dark:hover:bg-gray-800",
                      "group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-gray-800"
                    ]
                  }}
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 mt-2">
              <div className="flex items-center gap-3 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary-600 dark:text-primary-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 1 1 0-3.75Z" />
                </svg>
                <h4 className="text-sm font-medium text-primary-600 dark:text-primary-400">文章分類</h4>
              </div>
              
              <Select
                label="選擇分類"
                placeholder="選擇文章分類"
                selectionMode="multiple"
                selectedKeys={categories}
                onSelectionChange={(keys) => {
                  if (keys instanceof Set) {
                    setCategories(Array.from(keys) as string[]);
                  }
                }}
                color="primary"
                variant="bordered"
                radius="lg"
                labelPlacement="outside"
                classNames={{
                  label: "text-primary-600 dark:text-primary-400 font-medium",
                  trigger: [
                    "shadow-sm",
                    "bg-white dark:bg-gray-800",
                    "hover:bg-white dark:hover:bg-gray-800",
                    "group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-gray-800",
                    "border-gray-300 dark:border-gray-700"
                  ]
                }}
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                }
                renderValue={(items) => {
                  return (
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <Chip
                          key={item.key}
                          color="primary"
                          variant="flat"
                          size="sm"
                          className="max-w-[200px]"
                        >
                          {categoryOptions.find(cat => cat.id === item.key)?.name}
                        </Chip>
                      ))}
                    </div>
                  );
                }}
              >
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} textValue={category.name}>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 dark:text-gray-200">{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </Select>
              
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <Checkbox
                  isSelected={autoPublish}
                  onValueChange={setAutoPublish}
                  color="primary"
                  size="md"
                  className="gap-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">自動發布（不設為草稿）</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">選擇此選項將立即發布文章，否則會儲存為草稿</span>
                  </div>
                </Checkbox>
              </div>
            </div>
          </div>
        </CardBody>
        
        <CardFooter className="pt-5 gap-3 flex justify-end">
          <Button
            color="success"
            onClick={handleSubmit}
            disabled={canSubmit}
            isLoading={isSubmitting}
            className="font-medium shadow-sm whitespace-nowrap inline-flex items-center justify-center"
            startContent={
              !isSubmitting && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              )
            }
          >
            發佈到WordPress
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
} 