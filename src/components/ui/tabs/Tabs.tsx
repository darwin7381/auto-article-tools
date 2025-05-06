'use client';

import React from 'react';
import { Tabs as HeroTabs, Tab as HeroTab } from '@heroui/tabs';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  className?: string;
  variant?: "solid" | "bordered" | "light" | "underlined";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  selectedKey?: string;
  onSelectionChange?: (key: React.Key) => void;
}

export function Tabs({ 
  items, 
  className = '', 
  variant = "solid",
  color = "primary",
  size = "md",
  radius = "md",
  selectedKey,
  onSelectionChange,
  ...props
}: TabsProps) {
  return (
    <HeroTabs
      aria-label="Content tabs"
      variant={variant}
      color={color}
      size={size}
      radius={radius}
      className={className}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      {...props}
    >
      {items.map((item) => (
        <HeroTab 
          key={item.id} 
          title={item.label} 
          textValue={typeof item.label === 'string' ? item.label : undefined}
        >
          {item.content}
        </HeroTab>
      ))}
    </HeroTabs>
  );
} 