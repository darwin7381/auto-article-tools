'use client';

import React, { useState, useCallback } from 'react';
import { useConfigManagement } from '@/hooks/useConfigManagement';
import { Button } from '@/components/ui/button/Button';
import { Card, CardBody } from '@/components/ui/card/Card';
import { CRUDTab } from '@/components/ui/crud-tab';
import { RefreshCw, X, User, FileText, MessageSquare, Layout, Settings, Plus, Save } from 'lucide-react';
import { 
  AuthorForm, 
  ArticlePresetForm, 
  HeaderTemplateForm, 
  FooterTemplateForm 
} from './forms';
import { DefaultContentSettings, ArticleLink } from '@/services/strapi';

type TabType = 'authors' | 'headers' | 'footers' | 'presets' | 'content-templates';

// 統一的編輯表單組件 - 移到組件外部避免重新渲染
const EditForm = React.memo(({ children, onSave, onCancel }: {
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="space-y-6">
      {children}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <div></div>
        <div className="flex gap-3">
          <Button 
            onClick={onCancel} 
            variant="bordered" 
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button 
            onClick={onSave} 
            variant="solid" 
            color="primary" 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            儲存
          </Button>
        </div>
      </div>
    </div>
  </div>
));

EditForm.displayName = 'EditForm';

export function ConfigurationPanel() {
  const {
    authors,
    headerTemplates,
    footerTemplates,
    articlePresets,
    defaultContentSettings,
    loading,
    error,
    addAuthor,
    updateAuthor,
    deleteAuthor,
    addHeaderTemplate,
    updateHeaderTemplate,
    deleteHeaderTemplate,
    addFooterTemplate,
    updateFooterTemplate,
    deleteFooterTemplate,
    addArticlePreset,
    updateArticlePreset,
    deleteArticlePreset,
    updateDefaultContentSettings,
    reload,
  } = useConfigManagement();

  const [activeTab, setActiveTab] = useState<TabType>('presets');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white dark:bg-gray-900">
        <div className="text-center p-8">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">載入配置中...</h3>
          <p className="text-gray-600 dark:text-gray-400">正在從 Strapi CMS 讀取配置資料</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 max-w-md mx-auto">
        <CardBody className="text-center p-8">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <X className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">載入失敗</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={reload} className="mt-4" variant="solid" color="primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新嘗試
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4">
      {/* 標題與重新載入按鈕 */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CMS 配置管理</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">組合式配置系統 - 管理文稿類型預設和模板組件</p>
        </div>
        <Button 
          onClick={reload} 
          variant="bordered" 
          size="sm"
          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新載入
        </Button>
      </div>

      {/* 分頁標籤 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 p-1">
            {[
              { id: 'presets', label: '文稿類型預設', icon: Layout, count: articlePresets.length },
              { id: 'authors', label: '作者管理', icon: User, count: authors.length },
              { id: 'headers', label: '開頭押註模板', icon: MessageSquare, count: headerTemplates.length },
              { id: 'footers', label: '末尾押註模板', icon: FileText, count: footerTemplates.length },
              { id: 'content-templates', label: '預設內容管理', icon: Settings, count: null },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === id 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}{count !== null && ` (${count})`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* === 文稿類型預設 === */}
          {activeTab === 'presets' && (
            <CRUDTab
              title="文稿類型預設"
              description="組合式配置 - 將作者和押註模板組合成文稿類型"
              emptyStateText="點擊上方「新增預設」按鈕開始建立文稿類型組合"
              addButtonText="新增預設"
              icon={Layout}
              color="purple"
              items={articlePresets}
              addItem={addArticlePreset}
              updateItem={updateArticlePreset}
              deleteItem={deleteArticlePreset}
              getItemTitle={(item) => item.name}
              getItemSubtitle={(item) => item.code}
              getItemDescription={(item) => item.description}
              getItemTags={(item) => item.requiresAdTemplate ? [{ 
                label: '需要廣告模板', 
                color: '', 
                variant: 'warning' as const 
              }] : []}
              getItemDetails={(item) => [
                {
                  label: '預設作者',
                  value: item.defaultAuthor ? item.defaultAuthor.displayName : '無指定',
                  color: 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded text-xs'
                },
                {
                  label: '開頭押註',
                  value: item.headerDisclaimerTemplate ? item.headerDisclaimerTemplate.displayName : '無',
                  color: 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 px-2 py-1 rounded text-xs'
                },
                {
                  label: '末尾押註',
                  value: item.footerDisclaimerTemplate ? item.footerDisclaimerTemplate.displayName : '無',
                  color: 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 px-2 py-1 rounded text-xs'
                }
              ]}
              FormComponent={(props) => (
                <ArticlePresetForm 
                  {...props} 
                  authors={authors}
                  headerTemplates={headerTemplates}
                  footerTemplates={footerTemplates}
                />
              )}
            />
          )}

          {/* === 作者管理 === */}
          {activeTab === 'authors' && (
            <CRUDTab
              title="作者管理"
              description="管理文章作者資訊和 WordPress 作者 ID"
              emptyStateText="點擊上方「新增作者」按鈕開始建立作者資料"
              addButtonText="新增作者"
              icon={User}
              color="slate"
              items={authors}
              addItem={addAuthor}
              updateItem={updateAuthor}
              deleteItem={deleteAuthor}
              getItemTitle={(item) => item.displayName}
              getItemSubtitle={(item) => `帳號: ${item.name}`}
              getItemDescription={(item) => item.description}
              getItemTags={(item) => [
                ...(item.department ? [{ label: `部門: ${item.department}`, color: '', variant: 'default' as const }] : []),
                ...(item.wordpressId ? [{ label: `WordPress ID: ${item.wordpressId}`, color: '', variant: 'success' as const }] : [])
              ]}
              FormComponent={AuthorForm}
            />
          )}

          {/* === 開頭押註模板 === */}
          {activeTab === 'headers' && (
            <CRUDTab
              title="開頭押註模板"
              description="管理文章開頭的押註和免責聲明模板"
              emptyStateText="點擊上方「新增模板」按鈕開始建立開頭押註模板"
              addButtonText="新增模板"
              icon={MessageSquare}
              color="green"
              items={headerTemplates}
              addItem={addHeaderTemplate}
              updateItem={updateHeaderTemplate}
              deleteItem={deleteHeaderTemplate}
              getItemTitle={(item) => item.displayName}
              getItemSubtitle={(item) => `代碼: ${item.name}`}
              getItemDescription={(item) => item.description}
              FormComponent={HeaderTemplateForm}
              renderExtraContent={(item) => (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板內容:</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 p-2 rounded border">
                    {item.template || '無內容'}
                  </div>
                </div>
              )}
            />
          )}

          {/* === 末尾押註模板 === */}
          {activeTab === 'footers' && (
            <CRUDTab
              title="末尾押註模板"
              description="管理文章末尾的押註和廣告模板"
              emptyStateText="點擊上方「新增模板」按鈕開始建立末尾押註模板"
              addButtonText="新增模板"
              icon={FileText}
              color="orange"
              items={footerTemplates}
              addItem={addFooterTemplate}
              updateItem={updateFooterTemplate}
              deleteItem={deleteFooterTemplate}
              getItemTitle={(item) => item.displayName}
              getItemSubtitle={(item) => `代碼: ${item.name}`}
              getItemDescription={(item) => item.description}
              FormComponent={FooterTemplateForm}
              renderExtraContent={(item) => (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板內容:</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 p-2 rounded border">
                    {item.template || '無內容'}
                  </div>
                </div>
              )}
            />
          )}

          {/* === 預設內容管理 === */}
          {activeTab === 'content-templates' && (
            <ContentTemplatesTab
              defaultContentSettings={defaultContentSettings}
              updateDefaultContentSettings={updateDefaultContentSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 預設內容管理分頁
function ContentTemplatesTab({
  defaultContentSettings,
  updateDefaultContentSettings,
}: {
  defaultContentSettings: DefaultContentSettings | null;
  updateDefaultContentSettings: (data: Partial<DefaultContentSettings>) => Promise<DefaultContentSettings>;
}) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contextArticle: { title: '', url: '' },
    backgroundArticle: { title: '', url: '' },
    relatedReadingArticles: [{ title: '', url: '' }],
  });

  // 使用 API 資料，沒有資料時為 null
  const defaultContent = defaultContentSettings;

  const handleEdit = useCallback((section: string) => {
    setEditingSection(section);
    if (section === 'context' && defaultContent?.contextArticle) {
      // 只提取 title 和 url，避免包含 ID 字段
      setFormData(prev => ({
        ...prev,
        contextArticle: {
          title: defaultContent.contextArticle.title || '',
          url: defaultContent.contextArticle.url || ''
        },
      }));
    } else if (section === 'background' && defaultContent?.backgroundArticle) {
      // 只提取 title 和 url，避免包含 ID 字段
      setFormData(prev => ({
        ...prev,
        backgroundArticle: {
          title: defaultContent.backgroundArticle.title || '',
          url: defaultContent.backgroundArticle.url || ''
        },
      }));
    } else if (section === 'related' && defaultContent?.relatedReadingArticles) {
      // 只提取 title 和 url，避免包含 ID 字段
      setFormData(prev => ({
        ...prev,
        relatedReadingArticles: defaultContent.relatedReadingArticles.map(article => ({
          title: article.title || '',
          url: article.url || ''
        })),
      }));
    } else {
      // 如果沒有資料，使用空白預設值
      if (section === 'context') {
        setFormData(prev => ({
          ...prev,
          contextArticle: { title: '', url: '' },
        }));
      } else if (section === 'background') {
        setFormData(prev => ({
          ...prev,
          backgroundArticle: { title: '', url: '' },
        }));
      } else if (section === 'related') {
        setFormData(prev => ({
          ...prev,
          relatedReadingArticles: [{ title: '', url: '' }],
        }));
      }
    }
  }, [defaultContent]);

  const handleSave = useCallback(async () => {
    try {
      // 根據當前編輯的區域，只更新該區域的資料，保留其他區域的現有資料
      const currentData = defaultContent;
      
      const updateData = {
        contextArticle: currentData?.contextArticle ? 
          { title: currentData.contextArticle.title || '', url: currentData.contextArticle.url || '' } : 
          { title: '', url: '' },
        backgroundArticle: currentData?.backgroundArticle ? 
          { title: currentData.backgroundArticle.title || '', url: currentData.backgroundArticle.url || '' } : 
          { title: '', url: '' },
        relatedReadingArticles: currentData?.relatedReadingArticles ? 
          currentData.relatedReadingArticles.map(article => ({ 
            title: article.title || '', 
            url: article.url || '' 
          })) : 
          [],
        isActive: currentData?.isActive ?? true,
      };
      
      // 根據編輯的區域更新對應的資料
      if (editingSection === 'context') {
        updateData.contextArticle = formData.contextArticle;
      } else if (editingSection === 'background') {
        updateData.backgroundArticle = formData.backgroundArticle;
      } else if (editingSection === 'related') {
        updateData.relatedReadingArticles = formData.relatedReadingArticles;
      }
      
      console.log(`準備儲存的數據 (編輯區域: ${editingSection}):`, updateData);
      await updateDefaultContentSettings(updateData);
      setEditingSection(null);
      alert('儲存成功！');
    } catch (error) {
      console.error('儲存失敗:', error);
      alert(`儲存失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }, [formData, updateDefaultContentSettings, editingSection, defaultContent]);

  const handleCancel = useCallback(() => {
    setEditingSection(null);
    setFormData({
      contextArticle: { title: '', url: '' },
      backgroundArticle: { title: '', url: '' },
      relatedReadingArticles: [{ title: '', url: '' }],
    });
  }, []);

  const updateContextArticle = useCallback((field: 'title' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      contextArticle: { ...prev.contextArticle, [field]: value }
    }));
  }, []);

  const updateBackgroundArticle = useCallback((field: 'title' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      backgroundArticle: { ...prev.backgroundArticle, [field]: value }
    }));
  }, []);

  const updateRelatedArticle = useCallback((index: number, field: 'title' | 'url', value: string) => {
    setFormData(prev => {
      const updatedArticles = [...prev.relatedReadingArticles];
      updatedArticles[index] = { ...updatedArticles[index], [field]: value };
      return { ...prev, relatedReadingArticles: updatedArticles };
    });
  }, []);

  const addRelatedArticle = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      relatedReadingArticles: [...prev.relatedReadingArticles, { title: '', url: '' }]
    }));
  }, []);

  const removeRelatedArticle = useCallback((index: number) => {
    setFormData(prev => {
      if (prev.relatedReadingArticles.length > 1) {
        const updatedArticles = prev.relatedReadingArticles.filter((_, i) => i !== index);
        return { ...prev, relatedReadingArticles: updatedArticles };
      }
      return prev;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">預設內容管理</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理前情提要、背景補充、相關閱讀的預設文章連結</p>
      </div>

      <div className="space-y-6">
        {/* 前情提要文章 */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-orange-500" />
                前情提要預設文章
              </h4>
              <Button
                onClick={() => handleEdit('context')}
                variant="solid"
                color="primary"
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
              >
                編輯
              </Button>
            </div>
            {editingSection === 'context' ? (
              <EditForm
                onSave={handleSave}
                onCancel={handleCancel}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="context-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章標題 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="context-title"
                      type="text"
                      value={formData.contextArticle.title}
                      onChange={(e) => updateContextArticle('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                 placeholder-gray-400 dark:placeholder-gray-400"
                      placeholder="輸入文章標題"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="context-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章網址 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="context-url"
                      type="url"
                      value={formData.contextArticle.url}
                      onChange={(e) => updateContextArticle('url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                 placeholder-gray-400 dark:placeholder-gray-400"
                      placeholder="輸入文章網址"
                      required
                    />
                  </div>
                </div>
              </EditForm>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {defaultContent?.contextArticle ? (
                  <>
                    <div>
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章標題</h5>
                      <p className="text-gray-900 dark:text-gray-100 text-sm">{defaultContent.contextArticle.title}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章網址</h5>
                      <a 
                        href={defaultContent.contextArticle.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm"
                      >
                        {defaultContent.contextArticle.url}
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">尚未設定前情提要文章</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">點擊「編輯」按鈕開始設定</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 背景補充文章 */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                背景補充預設文章
              </h4>
              <Button
                onClick={() => handleEdit('background')}
                variant="solid"
                color="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              >
                編輯
              </Button>
            </div>
            {editingSection === 'background' ? (
              <EditForm
                onSave={handleSave}
                onCancel={handleCancel}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="background-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章標題 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="background-title"
                      type="text"
                      value={formData.backgroundArticle.title}
                      onChange={(e) => updateBackgroundArticle('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 placeholder-gray-400 dark:placeholder-gray-400"
                      placeholder="輸入文章標題"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="background-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章網址 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="background-url"
                      type="url"
                      value={formData.backgroundArticle.url}
                      onChange={(e) => updateBackgroundArticle('url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 placeholder-gray-400 dark:placeholder-gray-400"
                      placeholder="輸入文章網址"
                      required
                    />
                  </div>
                </div>
              </EditForm>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {defaultContent?.backgroundArticle ? (
                  <>
                    <div>
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章標題</h5>
                      <p className="text-gray-900 dark:text-gray-100 text-sm">{defaultContent.backgroundArticle.title}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章網址</h5>
                      <a 
                        href={defaultContent.backgroundArticle.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm"
                      >
                        {defaultContent.backgroundArticle.url}
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">尚未設定背景補充文章</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">點擊「編輯」按鈕開始設定</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 相關閱讀文章 */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Layout className="h-5 w-5 mr-2 text-green-500" />
                相關閱讀預設文章 ({defaultContent?.relatedReadingArticles?.length || 0})
              </h4>
              <Button
                onClick={() => handleEdit('related')}
                variant="solid"
                color="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
              >
                編輯
              </Button>
            </div>
            {editingSection === 'related' ? (
              <EditForm
                onSave={handleSave}
                onCancel={handleCancel}
              >
                <div className="space-y-4">
                  {formData.relatedReadingArticles.map((article, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">文章 {index + 1}</h5>
                        {formData.relatedReadingArticles.length > 1 && (
                          <Button
                            onClick={() => removeRelatedArticle(index)}
                            variant="bordered"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label 
                            htmlFor={`related-title-${index}`} 
                            className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                          >
                            文章標題 <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`related-title-${index}`}
                            type="text"
                            value={article.title}
                            onChange={(e) => updateRelatedArticle(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                       placeholder-gray-400 dark:placeholder-gray-400"
                            placeholder="輸入文章標題"
                            required
                          />
                        </div>
                        <div>
                          <label 
                            htmlFor={`related-url-${index}`} 
                            className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                          >
                            文章網址 <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`related-url-${index}`}
                            type="url"
                            value={article.url}
                            onChange={(e) => updateRelatedArticle(index, 'url', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                       placeholder-gray-400 dark:placeholder-gray-400"
                            placeholder="輸入文章網址"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={addRelatedArticle}
                    variant="bordered"
                    size="sm"
                    className="w-full border-green-300 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新增文章
                  </Button>
                </div>
              </EditForm>
            ) : (
              <div className="space-y-4">
                {defaultContent?.relatedReadingArticles?.length ? (
                  defaultContent.relatedReadingArticles.map((article: ArticleLink, index: number) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400">文章 {index + 1}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                          <div>
                            <h6 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章標題</h6>
                            <p className="text-gray-900 dark:text-gray-100 text-sm">{article.title}</p>
                          </div>
                          <div className="md:col-span-2">
                            <h6 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">文章網址</h6>
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm"
                            >
                              {article.url}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">尚未設定相關閱讀文章</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">點擊「編輯」按鈕開始設定</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
} 