'use client';

import React from 'react';
import { Input as HeroInput, InputProps as HeroInputProps } from '@heroui/input';

export interface InputProps extends HeroInputProps {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <HeroInput
      className={className}
      variant="bordered"
      radius="md"
      color="primary"
      labelPlacement="outside"
      classNames={{
        label: "text-foreground font-medium mb-1",
        inputWrapper: [
          "shadow-sm",
          "bg-default-50 dark:bg-default-50/10",
          "hover:bg-default-100 dark:hover:bg-default-100/10",
          "group-data-[focus=true]:bg-default-100 dark:group-data-[focus=true]:bg-default-100/10",
          "border-divider"
        ],
        input: "placeholder:text-default-500",
        ...props.classNames
      }}
      {...props}
    />
  );
} 