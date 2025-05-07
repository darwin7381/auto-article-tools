'use client';

import React, { useRef, useCallback } from 'react';
import { Button } from '../button/Button';

export interface FileUploadProps {
  onFileChange: (file: File) => void;
  accept?: string;
  selectedFile: File | null;
  onReset?: () => void;
  className?: string;
  label?: string;
  supportedFormatsText?: string;
  showBrowseButton?: boolean;
}

export function FileUpload({
  onFileChange,
  accept = '.pdf,.docx',
  selectedFile,
  onReset,
  className = '',
  label = '',
  supportedFormatsText = '支持 PDF 和 DOCX 格式',
  showBrowseButton = false
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
      e.target.value = '';
    }
  }, [onFileChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file, accept)) {
        onFileChange(file);
      }
    }
  }, [onFileChange, accept]);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const isValidFileType = (file: File, acceptTypes: string): boolean => {
    const types = acceptTypes.split(',').map(type => type.trim());
    return types.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col space-y-1">
        {label && (
          <label className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
            {label}
          </label>
        )}
        
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl transition-colors hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer"
          onClick={handleAreaClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
        >
          <div className="p-6 text-center">
            <div className="mb-3 flex justify-center">
              {selectedFile ? (
                selectedFile.name.endsWith('.pdf') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 10.5a0.5 0.5 0 01-0.5 0.5 0.5 0.5 0 01-0.5-0.5 0.5 0.5 0 110-1 0.5 0.5 0 110 1zM12 9.5v4M14 9.5v2M16 9.5v5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v4M9 17h6" />
                  </svg>
                )
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400 dark:text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              )}
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
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              aria-label="選擇文件上傳"
            />
            {showBrowseButton && (
              <Button
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAreaClick();
                }}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                }
                isFullWidth
              >
                瀏覽檔案
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          {supportedFormatsText}
        </div>
      </div>
      
      {selectedFile && onReset && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center">
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
            color="danger"
            variant="light"
            onClick={onReset}
            startIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            }
          >
            重設
          </Button>
        </div>
      )}
    </div>
  );
} 