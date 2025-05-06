'use client';

import React from 'react';
import { Button as HeroButton, ButtonProps as HeroButtonProps } from '@heroui/button';

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
  radius,
  variant,
  color,
  ...props 
}: ButtonProps) {
  return (
    <HeroButton 
      className={`${isFullWidth ? 'w-full' : ''} ${className}`}
      startContent={startIcon}
      endContent={endIcon}
      radius={radius}
      variant={variant}
      color={color}
      {...props}
    >
      {children}
    </HeroButton>
  );
} 