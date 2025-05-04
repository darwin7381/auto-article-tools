'use client';

import React from 'react';
import { Input as HeroInput, InputProps as HeroInputProps } from '@heroui/react';

export interface InputProps extends HeroInputProps {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <HeroInput
      className={className}
      variant="bordered"
      radius="lg"
      color="primary"
      labelPlacement="outside"
      classNames={{
        label: "text-primary-600 dark:text-primary-400 font-medium mb-1",
        inputWrapper: [
          "shadow-sm",
          "bg-white dark:bg-gray-800",
          "hover:bg-white dark:hover:bg-gray-800",
          "group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-gray-800",
          "border-gray-300 dark:border-gray-700"
        ],
        input: "placeholder:text-gray-500 dark:placeholder:text-gray-400",
        ...props.classNames
      }}
      {...props}
    />
  );
} 