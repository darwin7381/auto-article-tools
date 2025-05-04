'use client';

import React from 'react';
import { Tabs as HeroTabs, Tab as HeroTab, TabsProps as HeroTabsProps } from '@heroui/react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps extends Omit<HeroTabsProps, 'children'> {
  items: TabItem[];
  className?: string;
}

export function Tabs({ items, className = '', ...props }: TabsProps) {
  return (
    <HeroTabs
      aria-label="Tabs"
      variant="solid"
      color="default"
      radius="lg"
      classNames={{
        base: "w-full",
        tabList: "bg-gray-900/90 dark:bg-gray-900 rounded-xl p-1",
        tab: "py-2.5 px-4 text-gray-400 data-[selected=true]:bg-gray-800 dark:data-[selected=true]:bg-gray-800 data-[selected=true]:text-white dark:data-[selected=true]:text-white data-[selected=true]:shadow-small rounded-lg",
        panel: "pt-3",
        ...props.classNames
      }}
      className={className}
      {...props}
    >
      {items.map((item) => (
        <HeroTab key={item.id} title={item.label}>
          {item.content}
        </HeroTab>
      ))}
    </HeroTabs>
  );
} 