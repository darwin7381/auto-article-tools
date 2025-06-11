'use client';

import React, { useState } from 'react';
import { useConfigManagement } from '@/hooks/useConfigManagement';
import { Button } from '@/components/ui/button/Button';
import { Card, CardBody } from '@/components/ui/card/Card';
import { CRUDTab } from '@/components/ui/crud-tab';
import { RefreshCw, X, User, FileText, MessageSquare, Layout, Settings } from 'lucide-react';
import { 
  AuthorForm, 
  ArticlePresetForm, 
  HeaderTemplateForm, 
  FooterTemplateForm 
} from './forms';

type TabType = 'authors' | 'headers' | 'footers' | 'presets' | 'content-templates';

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
                  color: 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800'
                },
                {
                  label: '開頭押註',
                  value: item.headerDisclaimerTemplate ? item.headerDisclaimerTemplate.displayName : '無',
                  color: 'bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800'
                },
                {
                  label: '末尾押註',
                  value: item.footerDisclaimerTemplate ? item.footerDisclaimerTemplate.displayName : '無',
                  color: 'bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800'
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
}: {
  defaultContentSettings: unknown | null;
}) {
  // 使用 API 資料，如果沒有資料則使用預設值
  const defaultContent = defaultContentSettings || {
    contextArticle: {
      title: '範例前情文章標題',
      url: 'https://www.blocktempo.com/sample-context-article/'
    },
    backgroundArticle: {
      title: '範例背景文章標題', 
      url: 'https://www.blocktempo.com/sample-background-article/'
    },
    relatedReadingArticles: [
      { title: '範例相關文章標題一', url: 'https://www.blocktempo.com/sample-article-1/' },
      { title: '範例相關文章標題二', url: 'https://www.blocktempo.com/sample-article-2/' },
      { title: '範例相關文章標題三', url: 'https://www.blocktempo.com/sample-article-3/' }
    ],
    isActive: true,
  };

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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
            </div>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
            </div>
          </CardBody>
        </Card>

        {/* 相關閱讀文章 */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Layout className="h-5 w-5 mr-2 text-green-500" />
                相關閱讀預設文章 ({defaultContent.relatedReadingArticles.length})
              </h4>
            </div>
            <div className="space-y-4">
              {defaultContent.relatedReadingArticles.map((article: any, index: number) => (
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
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
} 