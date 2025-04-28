import React, { useEffect, useState } from 'react';

interface ProcessingProgressProps {
  currentStage: string;
  progress: number; // 0-100
  isComplete: boolean;
}

const stages = [
  { id: 'uploading', label: '上傳文件' },
  { id: 'extracting', label: '提取內容' },
  { id: 'detecting', label: '偵測語言' },
  { id: 'translating', label: '翻譯內容' },
  { id: 'enhancing', label: '優化格式' },
  { id: 'complete', label: '處理完成' }
];

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  currentStage,
  progress,
  isComplete
}) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const stageIndex = stages.findIndex(stage => stage.id === currentStage);
    if (stageIndex !== -1) {
      setActiveStage(stageIndex);
    } else if (isComplete) {
      setActiveStage(stages.length - 1);
    }
  }, [currentStage, isComplete]);

  return (
    <div className="w-full max-w-3xl mx-auto my-8">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">處理進度</h3>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>正在進行: {stages[activeStage]?.label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
      
      {/* 進度條 */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* 階段指示 */}
      <div className="mt-8">
        <div className="flex justify-between">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index < activeStage 
                    ? 'bg-green-500 text-white' 
                    : index === activeStage
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {index < activeStage ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs mt-2 text-center max-w-[80px]">{stage.label}</span>
            </div>
          ))}
        </div>
        <div className="relative flex items-center justify-between mt-4">
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full bg-gray-200 h-0.5 dark:bg-gray-700" />
          {stages.map((_, index) => (
            <div 
              key={index} 
              className={`w-4 h-4 rounded-full z-10 ${
                index < activeStage 
                  ? 'bg-green-500' 
                  : index === activeStage 
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress; 