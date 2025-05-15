'use client';

import React from 'react';
import { Progress as HeroProgress, ProgressProps as HeroProgressProps } from '@heroui/progress';

export interface ProgressProps extends HeroProgressProps {
  className?: string;
}

export function Progress({ className = '', ...props }: ProgressProps) {
  // 獲取顏色並設置對應的進度條顏色
  const color = props.color || 'primary';
  const barColorClass = 
    color === 'primary' ? 'bg-primary-600' :
    color === 'success' ? 'bg-success-600' :
    color === 'danger' ? 'bg-danger-600' :
    color === 'warning' ? 'bg-warning-600' :
    color === 'secondary' ? 'bg-secondary-600' :
    'bg-gray-600';

  return (
    <HeroProgress
      className={`bg-gray-300 dark:bg-gray-700 ${className}`}
      showValueLabel={false}
      barClassName={`${barColorClass} transition-all`}
      {...props}
    />
  );
} 