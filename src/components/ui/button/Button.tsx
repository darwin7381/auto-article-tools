'use client';

import React from 'react';
import { Button as HeroButton, ButtonProps as HeroButtonProps } from '@heroui/react';

export interface ButtonProps extends Omit<HeroButtonProps, 'fullWidth'> {
  children: React.ReactNode;
  className?: string;
  isFullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export function Button({ 
  children, 
  className = '', 
  isFullWidth = false, 
  startIcon,
  endIcon,
  ...props 
}: ButtonProps) {
  return (
    <HeroButton 
      className={`font-medium inline-flex items-center justify-center whitespace-nowrap ${isFullWidth ? 'w-full' : ''} ${className}`}
      startContent={startIcon}
      endContent={endIcon}
      {...props}
    >
      {children}
    </HeroButton>
  );
} 