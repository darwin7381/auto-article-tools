'use client';

import React from 'react';
import { Progress as HeroProgress, ProgressProps as HeroProgressProps } from '@heroui/react';

export interface ProgressProps extends HeroProgressProps {
  className?: string;
}

export function Progress({ className = '', ...props }: ProgressProps) {
  return (
    <HeroProgress
      className={`bg-gray-200 dark:bg-gray-700 ${className}`}
      showValueLabel={false}
      {...props}
    />
  );
} 