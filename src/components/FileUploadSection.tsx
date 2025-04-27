'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { Input } from '@heroui/react';
import { Button } from '@heroui/react';
import { Tabs, Tab } from '@heroui/react';
import { Chip } from '@heroui/react';

export default function FileUploadSection() {
  const [selectedTab, setSelectedTab] = useState('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('website');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedTab === 'file' && selectedFile) {
      console.log('上傳文件:', selectedFile);
      // 實際上傳邏輯將在後續階段實現
    } else if (selectedTab === 'link' && linkUrl) {
      console.log('處理連結:', linkUrl, '類型:', linkType);
      // 連結處理邏輯將在後續階段實現
    }
  };

  return (
    <section id="upload-section" className="w-full">
      <Card className="border-none shadow-none">
        <CardHeader className="flex flex-col gap-1.5 pb-0">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">文件輸入</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">選擇上傳文件或輸入文章連結</p>
        </CardHeader>
        
        <CardBody className="pt-5 overflow-hidden">
          <Tabs 
            aria-label="輸入選項" 
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key.toString())}
            color="primary"
            variant="underlined"
            classNames={{
              base: "w-full",
              tabList: "gap-6 relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary-500",
              tab: "max-w-fit px-2 h-12",
              tabContent: "group-data-[selected=true]:text-primary-600 dark:group-data-[selected=true]:text-primary-400 font-medium"
            }}
          >
            <Tab 
              key="file" 
              title={
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  上傳文件
                </div>
              }
            >
              <div className="w-full py-6 space-y-6">
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
                    選擇文件
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl transition-colors hover:border-primary-300 dark:hover:border-primary-700">
                    <div className="p-6 text-center">
                      <div className="mb-3 flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400 dark:text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {selectedFile 
                            ? `已選擇: ${selectedFile.name}` 
                            : '拖放文件到這裡或點擊選擇'}
                        </p>
                        {selectedFile && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            ({(selectedFile.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                      
                      <input
                        type="file"
                        id="file-upload"
                        accept=".pdf,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="選擇文件上傳"
                      />
                      <Button
                        as="label"
                        htmlFor="file-upload"
                        color="primary"
                        variant="flat"
                        className="text-sm font-medium"
                        startContent={
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                          </svg>
                        }
                      >
                        瀏覽文件
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    支持 PDF 和 DOCX 格式
                  </div>
                </div>
                
                {selectedFile && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                        {selectedFile.name.endsWith('.pdf') ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 10.5a0.5 0.5 0 01-0.5 0.5 0.5 0.5 0 01-0.5-0.5 0.5 0.5 0 110-1 0.5 0.5 0 110 1zM12 9.5v4M14 9.5v2M16 9.5v5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v4M9 17h6" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <Button 
                      isIconOnly
                      color="danger" 
                      variant="light" 
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      aria-label="移除文件"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            </Tab>

            <Tab 
              key="link" 
              title={
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  輸入連結
                </div>
              }
            >
              <div className="w-full py-6 space-y-6">
                <Input
                  type="url"
                  label="文章連結"
                  placeholder="請輸入文章URL，例如：https://example.com/article"
                  value={linkUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)}
                  variant="bordered"
                  color="primary"
                  radius="lg"
                  labelPlacement="outside"
                  description="輸入包含文章內容的網頁連結"
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
                
                <div className="space-y-3 mt-2">
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">連結類型</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'website', name: '一般網站', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      )},
                      { id: 'gdocs', name: 'Google Docs', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                        </svg>
                      )},
                      { id: 'medium', name: 'Medium', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.5 4A5.5 5.5 0 0 0 2 9.5v5A5.5 5.5 0 0 0 7.5 20h9a5.5 5.5 0 0 0 5.5-5.5v-5A5.5 5.5 0 0 0 16.5 4h-9zM16 15.1c0 .1-.1.1-.2.1h-1.6c-.1 0-.1 0-.2-.1v-6c0-.1.1-.1.2-.1h1.6c.1 0 .2 0 .2.1v6zM9.7 15h-.8c-.11 0-.2-.09-.2-.2V9h1.5c.3 0 .5-.1.7-.3.2-.2.3-.4.3-.7 0-.6-.8-1-1.3-1H5.9c-.11 0-.2.09-.2.2v7c0 .11.09.2.2.2h.8c.11 0 .2-.09.2-.2v-5h.5c.33 0 .6.27.6.6v4.4c0 .11.09.2.2.2h1.3c.11 0 .2-.09.2-.2V9c0-.11.09-.2.2-.2h2.2c.11 0 .2.09.2.2v5.8c0 .11-.09.2-.2.2h-2.2z"/>
                        </svg>
                      )},
                      { id: 'wechat', name: 'WeChat', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.2 13.3c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm3.6-.9c0-.5.4-.9.9-.9s.9.4.9.9-.4.9-.9.9-.9-.4-.9-.9zm2.5-5.3c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zM9.7 8c0 .5-.4.9-.9.9s-.9-.4-.9-.9.4-.9.9-.9.9.4.9.9zM17.9 12c.1-.9 0-2.4-.2-3.5-.8-3.6-4.1-6.3-8-6.3s-7.3 2.7-8 6.3c-.2 1.1-.2 2.6-.2 3.5 0 .6.1 1.2.2 1.9-1.6 2-2.1 4-1.1 5.5.7 1 1.9 1.5 3.3 1.5.2 0 .5 0 .7-.1 1.1-.1 2.7-.7 4.2-1.4.2-.1.4-.2.6-.2 1.1 0 2.7.9 4.9 1.6h.1c.2 0 .4.1.6.1 1.4 0 2.6-.5 3.3-1.5 1-1.4.5-3.5-1.1-5.5.1-.6.2-1.3.2-1.9h.1z"/>
                        </svg>
                      )}
                    ].map((type) => (
                      <div 
                        key={type.id}
                        className={`
                          relative flex items-center gap-2 p-3 rounded-xl cursor-pointer
                          border-2 transition-colors
                          ${linkType === type.id 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-200 dark:hover:border-primary-800'}
                        `}
                        onClick={() => setLinkType(type.id)}
                      >
                        <span className={linkType === type.id ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400'}>
                          {type.icon}
                        </span>
                        <span className="text-sm font-medium">{type.name}</span>
                        {linkType === type.id && (
                          <Chip
                            size="sm"
                            color="primary"
                            className="absolute -top-2 -right-2 shadow-sm border border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                          >
                            已選擇
                          </Chip>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                      <span>
                        選擇正確的連結類型可以幫助系統更準確地提取文章內容。例如，WeChat 和 Medium 等平台有特殊的內容結構，需要專門的處理方法。
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
        
        <CardFooter className="pt-5 flex justify-end gap-3">
          <Button 
            color="primary" 
            variant="flat" 
            className="font-medium"
          >
            重置
          </Button>
          <Button 
            color="primary" 
            onClick={handleUpload}
            disabled={(selectedTab === 'file' && !selectedFile) || (selectedTab === 'link' && !linkUrl)}
            className="font-medium shadow-sm"
            startContent={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            }
          >
            {selectedTab === 'file' ? '上傳並處理' : '處理連結'}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
} 