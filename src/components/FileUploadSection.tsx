'use client';

import { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
      setUploadSuccess(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setSelectedFile(file);
        setUploadError(null);
        setUploadSuccess(false);
      } else {
        setUploadError('只能上傳 PDF 或 DOCX 文件');
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReset = () => {
    if (selectedTab === 'file') {
      setSelectedFile(null);
      setUploadError(null);
      setUploadSuccess(false);
    } else {
      setLinkUrl('');
      setLinkType('website');
      setUrlError(null);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('請輸入有效的URL');
      return false;
    }
  };

  const uploadFileToR2 = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '上傳失敗');
      }
      
      console.log('上傳成功:', result);
      setUploadSuccess(true);
      return result;
    } catch (error) {
      console.error('上傳錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '上傳失敗，請稍後重試');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (selectedTab === 'file' && selectedFile) {
      const result = await uploadFileToR2(selectedFile);
      if (result) {
        console.log('文件已上傳並準備處理:', result);
      }
    } else if (selectedTab === 'link' && linkUrl) {
      if (validateUrl(linkUrl)) {
        console.log('處理連結:', linkUrl, '類型:', linkType);
        // 連結處理邏輯將在後續階段實現
      }
    }
  };

  const handleAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
    if (e.target.value) {
      validateUrl(e.target.value);
    } else {
      setUrlError(null);
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
          <Tabs aria-label="輸入選項" selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key.toString())}>
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
              <Card className="border-none shadow-none">
                <CardBody>
                  <div className="w-full py-6 space-y-6">
                    <div className="flex flex-col space-y-1">
                      <label className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
                        選擇文件
                      </label>
                      
                      <div 
                        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl transition-colors hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer"
                        onClick={handleAreaClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                      >
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
                            ref={fileInputRef}
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
                            className="text-sm font-medium inline-flex items-center"
                            startContent={
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
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
                    
                    {uploadError && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          {uploadError}
                        </p>
                      </div>
                    )}
                    
                    {uploadSuccess && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          文件上傳成功，準備處理
                        </p>
                      </div>
                    )}
                    
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
                </CardBody>
              </Card>
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
              <Card className="border-none shadow-none">
                <CardBody>
                  <div className="w-full py-6 space-y-6">
                    <div className="max-w-full">
                      <Input
                        label="文章連結"
                        type="url"
                        placeholder="請輸入文章URL，例如：https://example.com/article"
                        value={linkUrl}
                        onChange={handleLinkChange}
                        isInvalid={!!urlError}
                        errorMessage={urlError}
                        description="輸入包含文章內容的網頁連結"
                        isClearable
                        startContent={
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                        }
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-primary-600 dark:text-primary-400">連結類型</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div 
                          className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'website' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                          onClick={() => setLinkType('website')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'website' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                          <span className="text-sm font-medium">一般網站</span>
                        </div>
                        
                        <div 
                          className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'gdocs' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                          onClick={() => setLinkType('gdocs')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'gdocs' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          <span className="text-sm font-medium">Google Docs</span>
                        </div>
                        
                        <div 
                          className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'medium' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                          onClick={() => setLinkType('medium')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'medium' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <path d="M21 15l-5-5L5 21"></path>
                          </svg>
                          <span className="text-sm font-medium">Medium</span>
                        </div>
                        
                        <div 
                          className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'wechat' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                          onClick={() => setLinkType('wechat')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'wechat' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <line x1="9" y1="10" x2="9" y2="10"></line>
                            <line x1="12" y1="10" x2="12" y2="10"></line>
                            <line x1="15" y1="10" x2="15" y2="10"></line>
                          </svg>
                          <span className="text-sm font-medium">WeChat</span>
                        </div>
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
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </CardBody>
        
        <CardFooter className="pt-5 flex justify-end gap-3">
          <Button 
            color="primary" 
            variant="flat" 
            className="font-medium inline-flex items-center"
            onClick={handleReset}
          >
            重置
          </Button>
          <Button 
            color="primary" 
            onClick={handleUpload}
            disabled={(selectedTab === 'file' && !selectedFile) || (selectedTab === 'link' && !linkUrl) || isUploading}
            isLoading={isUploading}
            className="font-medium shadow-sm whitespace-nowrap inline-flex items-center"
            startContent={
              !isUploading && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              )
            }
          >
            {selectedTab === 'file' ? '上傳並處理' : '處理連結'}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
} 