import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { ConfigurationCard } from '@/components/ui/configuration-card';
import { Plus, LucideIcon } from 'lucide-react';

export interface CRUDItem {
  documentId: string;
  isActive: boolean;
}

export interface CRUDTabConfig<T extends CRUDItem> {
  // 基本配置
  title: string;
  description: string;
  emptyStateText: string;
  addButtonText: string;
  
  // 樣式配置
  icon: LucideIcon;
  color: 'purple' | 'slate' | 'green' | 'orange' | 'blue';
  
  // 數據和操作 - 使用更寬鬆的類型
  items: T[];
  addItem: (data: Partial<T>) => Promise<T>;
  updateItem: (id: string, data: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;
  
  // 渲染函數
  getItemTitle: (item: T) => string;
  getItemSubtitle: (item: T) => string;
  getItemDescription?: (item: T) => string | undefined;
  getItemTags?: (item: T) => Array<{ label: string; color: string; variant?: 'default' | 'warning' | 'success' | 'danger' }>;
  getItemDetails?: (item: T) => Array<{ label: string; value: string; color: string }>;
  
  // 表單組件
  FormComponent: React.ComponentType<{
    item?: T;
    onSave: (data: Partial<T>) => Promise<void>;
    onCancel: () => void;
  } & Record<string, unknown>>; // 允許額外的 props
  
  // 額外渲染函數（用於特殊內容，如模板內容預覽）
  renderExtraContent?: (item: T) => React.ReactNode;
}

export function CRUDTab<T extends CRUDItem>({
  title,
  description,
  emptyStateText,
  addButtonText,
  icon: Icon,
  color,
  items,
  addItem,
  updateItem,
  deleteItem,
  getItemTitle,
  getItemSubtitle,
  getItemDescription,
  getItemTags = () => [],
  getItemDetails = () => [],
  FormComponent,
  renderExtraContent
}: CRUDTabConfig<T>) {
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const colorConfigs = {
    purple: {
      bgClass: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950',
      titleClass: 'text-purple-900 dark:text-purple-100',
      buttonClass: 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 text-white',
      iconBg: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
    },
    slate: {
      bgClass: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950',
      titleClass: 'text-slate-900 dark:text-slate-100',
      buttonClass: 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 text-white',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
    },
    green: {
      bgClass: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950',
      titleClass: 'text-green-900 dark:text-green-100',
      buttonClass: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white',
      iconBg: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
    },
    orange: {
      bgClass: 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-950',
      titleClass: 'text-orange-900 dark:text-orange-100',
      buttonClass: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white',
      iconBg: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
    },
    blue: {
      bgClass: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950',
      titleClass: 'text-blue-900 dark:text-blue-100',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white',
      iconBg: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
    }
  };

  const config = colorConfigs[color];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)} 
          variant="solid" 
          color="primary"
          className={config.buttonClass}
        >
          <Plus className="h-4 w-4 mr-2" />
          {addButtonText}
        </Button>
      </div>

      {showAddForm && (
        <Card className={config.bgClass}>
          <CardHeader>
            <h4 className={`text-lg font-semibold ${config.titleClass}`}>{addButtonText}</h4>
          </CardHeader>
          <CardBody>
            <FormComponent
              onSave={async (data) => {
                await addItem(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="text-center py-8">
              <Icon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無資料</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyStateText}</p>
            </CardBody>
          </Card>
        ) : (
          items.map((item) => (
            <ConfigurationCard
              key={item.documentId}
              title={getItemTitle(item)}
              subtitle={getItemSubtitle(item)}
              description={getItemDescription?.(item)}
              icon={Icon}
              iconColor={config.iconBg}
              isActive={item.isActive}
              isEditing={editingItem?.documentId === item.documentId}
              hoverColor={color}
              tags={getItemTags(item)}
              details={getItemDetails(item)}
              onEdit={() => setEditingItem(item)}
              onDelete={() => {
                if (confirm(`確定要刪除「${getItemTitle(item)}」嗎？`)) {
                  deleteItem(item.documentId);
                }
              }}
            >
              {editingItem?.documentId === item.documentId && (
                <FormComponent
                  item={item}
                  onSave={async (data) => {
                    await updateItem(item.documentId, data);
                    setEditingItem(null);
                  }}
                  onCancel={() => setEditingItem(null)}
                />
              )}
              {editingItem?.documentId !== item.documentId && renderExtraContent?.(item)}
            </ConfigurationCard>
          ))
        )}
      </div>
    </div>
  );
} 