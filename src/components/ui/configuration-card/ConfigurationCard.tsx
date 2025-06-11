import React from 'react';
import { Card, CardBody } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Edit, Trash2, LucideIcon } from 'lucide-react';

interface ConfigurationCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  iconColor: string;
  isActive?: boolean;
  isEditing?: boolean;
  tags?: { label: string; color: string; variant?: 'default' | 'warning' | 'success' | 'danger' }[];
  details?: { label: string; value: string; color: string }[];
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
  hoverColor?: string;
}

export function ConfigurationCard({
  title,
  subtitle,
  description,
  icon: Icon,
  iconColor,
  isActive = true,
  isEditing = false,
  tags = [],
  details = [],
  onEdit,
  onDelete,
  children,
  hoverColor = 'purple'
}: ConfigurationCardProps) {
  const getHoverColors = (color: string) => {
    const colors = {
      purple: 'hover:border-purple-300 dark:hover:border-purple-600',
      slate: 'hover:border-slate-300 dark:hover:border-slate-600',
      orange: 'hover:border-orange-300 dark:hover:border-orange-600',
      blue: 'hover:border-blue-300 dark:hover:border-blue-600',
      green: 'hover:border-green-300 dark:hover:border-green-600',
    };
    return colors[color as keyof typeof colors] || colors.purple;
  };

  const getEditButtonColors = (color: string) => {
    const colors = {
      purple: 'border-purple-200 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900',
      slate: 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
      orange: 'border-orange-200 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900',
      blue: 'border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900',
      green: 'border-green-200 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900',
    };
    return colors[color as keyof typeof colors] || colors.purple;
  };

  const getTagVariantColors = (variant: string) => {
    const variants = {
      default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      warning: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      success: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      danger: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  if (isEditing && children) {
    return (
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardBody>
          {children}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${getHoverColors(hoverColor)} transition-colors`}>
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`${iconColor} p-3 rounded-full`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {subtitle && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {subtitle}
                    </span>
                  )}
                  {tags.map((tag, index) => (
                    <span 
                      key={index}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTagVariantColors(tag.variant || 'default')}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                  <span className={`text-xs ${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isActive ? '✓ 啟用' : '✗ 停用'}
                  </span>
                </div>
              </div>
            </div>
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <Button
                    variant="bordered"
                    size="sm"
                    onClick={onEdit}
                    className={getEditButtonColors(hoverColor)}
                    startIcon={<Edit className="h-4 w-4" />}
                  >
                    編輯
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="bordered"
                    size="sm"
                    color="danger"
                    onClick={onDelete}
                    className="border-red-200 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                    startIcon={<Trash2 className="h-4 w-4" />}
                  >
                    刪除
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {details.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {details.map((detail, index) => (
                <div key={index} className={`${detail.color} p-3 rounded-lg border`}>
                  <p className="text-sm font-medium mb-1">{detail.label}</p>
                  <p>{detail.value}</p>
                </div>
              ))}
            </div>
          )}

          {description && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
            </div>
          )}

          {children}
        </div>
      </CardBody>
    </Card>
  );
} 