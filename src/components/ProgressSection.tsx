'use client';

import { Card, CardHeader, CardBody } from '@heroui/react';
import { Progress } from '@heroui/react';

export default function ProgressSection() {
  // 模擬進度狀態，實際應用中這會是從API獲取或通過狀態管理
  const progress = 0; // 初始進度為0
  const currentStep = '等待上傳';
  const steps = ['文件上傳', '內容提取', '格式處理', '準備發布'];

  return (
    <section id="progress-section">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">處理進度</h2>
          <p className="text-gray-500 dark:text-gray-400">檢視文件處理進度</p>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <div className="flex flex-col md:flex-row md:items-center mb-3 gap-2 md:gap-0 md:justify-between">
                <div className="flex items-center">
                  <span className="h-3 w-3 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{currentStep}</span>
                </div>
                <span className="text-sm font-medium bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-1 px-3 rounded-full shadow-sm">
                  {progress}% 已完成
                </span>
              </div>
              <Progress 
                value={progress} 
                color="primary" 
                size="lg"
                radius="full"
                aria-label="處理進度" 
                className="h-3"
                classNames={{
                  track: "bg-blue-100 dark:bg-blue-800/30",
                  indicator: "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-500"
                }}
              />
            </div>
            
            <div className="mt-8">
              <div className="flex justify-between items-center relative">
                {/* 底層進度線 */}
                <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                {/* 活躍進度線 */}
                <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-primary-500 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.max((0 / (steps.length - 1)) * 100, 0)}%` }}></div>
                
                {steps.map((step, index) => {
                  const isActive = index === 0;
                  const isPast = index < 0;
                  
                  return (
                    <div 
                      key={index} 
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-md transition-all duration-300 ${
                        isPast 
                          ? 'bg-primary-500 text-white' 
                          : isActive 
                            ? 'bg-primary-500 text-white ring-4 ring-primary-100 dark:ring-primary-900/30' 
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}>
                        {isPast ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="relative">
                        <span className={`text-xs font-medium text-center block w-20 -ml-5 ${
                          isActive || isPast ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
} 