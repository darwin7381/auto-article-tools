'use client';

import React, { useState } from 'react';
import { useConfigManagement } from '@/hooks/useConfigManagement';
import { Button } from '@/components/ui/button/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/card/Card';
import { ConfigurationCard } from '@/components/ui/configuration-card';
import { Trash2, Edit, Plus, Save, X, User, FileText, Settings, RefreshCw, MessageSquare, Layout } from 'lucide-react';
import { 
  Author, 
  HeaderDisclaimerTemplate, 
  FooterDisclaimerTemplate, 
  ArticleTypePreset
} from '@/services/strapi';

// 預設內容設定類型
interface ArticleLink {
  title: string;
  url: string;
}

interface DefaultContentSettings {
  contextArticle: ArticleLink;
  backgroundArticle: ArticleLink;
  relatedReadingArticles: ArticleLink[];
  isActive: boolean;
}

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

  const [activeTab, setActiveTab] = useState<'authors' | 'headers' | 'footers' | 'presets' | 'content-templates'>('presets');

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
                onClick={() => setActiveTab(id as any)}
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
          {activeTab === 'presets' && (
            <ArticlePresetsTab
              presets={articlePresets}
              authors={authors}
              headerTemplates={headerTemplates}
              footerTemplates={footerTemplates}
              addArticlePreset={addArticlePreset}
              updateArticlePreset={updateArticlePreset}
              deleteArticlePreset={deleteArticlePreset}
            />
          )}

          {activeTab === 'authors' && (
            <AuthorsTab
              authors={authors}
              addAuthor={addAuthor}
              updateAuthor={updateAuthor}
              deleteAuthor={deleteAuthor}
            />
          )}

          {activeTab === 'headers' && (
            <HeaderTemplatesTab
              templates={headerTemplates}
              addHeaderTemplate={addHeaderTemplate}
              updateHeaderTemplate={updateHeaderTemplate}
              deleteHeaderTemplate={deleteHeaderTemplate}
            />
          )}

          {activeTab === 'footers' && (
            <FooterTemplatesTab
              templates={footerTemplates}
              addFooterTemplate={addFooterTemplate}
              updateFooterTemplate={updateFooterTemplate}
              deleteFooterTemplate={deleteFooterTemplate}
            />
          )}

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

// 文稿類型預設管理分頁
function ArticlePresetsTab({
  presets,
  authors,
  headerTemplates,
  footerTemplates,
  addArticlePreset,
  updateArticlePreset,
  deleteArticlePreset,
}: {
  presets: ArticleTypePreset[];
  authors: Author[];
  headerTemplates: HeaderDisclaimerTemplate[];
  footerTemplates: FooterDisclaimerTemplate[];
  addArticlePreset: (data: Partial<ArticleTypePreset>) => Promise<ArticleTypePreset>;
  updateArticlePreset: (id: string, data: Partial<ArticleTypePreset>) => Promise<ArticleTypePreset>;
  deleteArticlePreset: (id: string) => Promise<void>;
}) {
  const [editingPreset, setEditingPreset] = useState<ArticleTypePreset | null>(null);
  const [showAddPreset, setShowAddPreset] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">文稿類型預設</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">組合式配置 - 將作者和押註模板組合成文稿類型</p>
        </div>
        <Button 
          onClick={() => setShowAddPreset(true)} 
          variant="solid" 
          color="primary"
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增預設
        </Button>
      </div>

      {showAddPreset && (
        <Card className="border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950">
          <CardHeader>
            <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">新增文稿類型預設</h4>
          </CardHeader>
          <CardBody>
            <ArticlePresetForm
              authors={authors}
              headerTemplates={headerTemplates}
              footerTemplates={footerTemplates}
              onSave={async (data) => {
                await addArticlePreset(data);
                setShowAddPreset(false);
              }}
              onCancel={() => setShowAddPreset(false)}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {presets.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="text-center py-8">
              <Layout className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無文稿類型預設</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">點擊上方「新增預設」按鈕開始建立文稿類型組合</p>
            </CardBody>
          </Card>
        ) : (
          presets.map((preset: ArticleTypePreset) => (
            <ConfigurationCard
              key={preset.documentId}
              title={preset.name}
              subtitle={preset.code}
              description={preset.description}
              icon={Layout}
              iconColor="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
              isActive={preset.isActive}
              isEditing={editingPreset?.documentId === preset.documentId}
              hoverColor="purple"
              tags={preset.requiresAdTemplate ? [{ label: '需要廣告模板', color: '', variant: 'warning' }] : []}
              details={[
                {
                  label: '預設作者',
                  value: preset.defaultAuthor ? preset.defaultAuthor.displayName : '無指定',
                  color: 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800'
                },
                {
                  label: '開頭押註',
                  value: preset.headerDisclaimerTemplate ? preset.headerDisclaimerTemplate.displayName : '無',
                  color: 'bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800'
                },
                {
                  label: '末尾押註',
                  value: preset.footerDisclaimerTemplate ? preset.footerDisclaimerTemplate.displayName : '無',
                  color: 'bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800'
                }
              ]}
              onEdit={() => setEditingPreset(preset)}
              onDelete={() => {
                if (confirm(`確定要刪除文稿類型預設「${preset.name}」嗎？`)) {
                  deleteArticlePreset(preset.documentId);
                }
              }}
            >
              {editingPreset?.documentId === preset.documentId && (
                <ArticlePresetForm
                  preset={preset}
                  authors={authors}
                  headerTemplates={headerTemplates}
                  footerTemplates={footerTemplates}
                  onSave={async (data) => {
                    await updateArticlePreset(preset.documentId, data);
                    setEditingPreset(null);
                  }}
                  onCancel={() => setEditingPreset(null)}
                />
              )}
            </ConfigurationCard>
          ))
        )}
      </div>
    </div>
  );
}

// 文稿類型預設表單組件
function ArticlePresetForm({ 
  preset, 
  authors,
  headerTemplates,
  footerTemplates,
  onSave, 
  onCancel 
}: { 
  preset?: ArticleTypePreset;
  authors: Author[];
  headerTemplates: HeaderDisclaimerTemplate[];
  footerTemplates: FooterDisclaimerTemplate[];
  onSave: (data: Partial<ArticleTypePreset>) => Promise<void>; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: preset?.name || '',
    code: preset?.code || '',
    description: preset?.description || '',
    defaultAuthorId: preset?.defaultAuthor?.documentId || '',
    headerDisclaimerTemplateId: preset?.headerDisclaimerTemplate?.documentId || '',
    footerDisclaimerTemplateId: preset?.footerDisclaimerTemplate?.documentId || '',
    requiresAdTemplate: preset?.requiresAdTemplate ?? false,
    isActive: preset?.isActive ?? true,
    sortOrder: preset?.sortOrder || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<ArticleTypePreset> = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        requiresAdTemplate: formData.requiresAdTemplate,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      // 處理關聯字段 - Strapi 5 格式
      if (formData.defaultAuthorId) {
        (cleanData as any).defaultAuthor = { connect: [{ documentId: formData.defaultAuthorId }] };
      }
      
      if (formData.headerDisclaimerTemplateId) {
        (cleanData as any).headerDisclaimerTemplate = { connect: [{ documentId: formData.headerDisclaimerTemplateId }] };
      }
      
      if (formData.footerDisclaimerTemplateId) {
        (cleanData as any).footerDisclaimerTemplate = { connect: [{ documentId: formData.footerDisclaimerTemplateId }] };
      }
      
      console.log('提交文稿類型預設:', cleanData);
      await onSave(cleanData);
      alert('文稿類型預設儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存文稿類型預設失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：廣編稿"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              代碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例：sponsored"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="這個文稿類型的用途說明"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設作者
            </label>
            <select
              value={formData.defaultAuthorId}
              onChange={(e) => setFormData({ ...formData, defaultAuthorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無指定 --</option>
              {authors.map((author) => (
                <option key={author.documentId} value={author.documentId}>
                  {author.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              開頭押註模板
            </label>
            <select
              value={formData.headerDisclaimerTemplateId}
              onChange={(e) => setFormData({ ...formData, headerDisclaimerTemplateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無 --</option>
              {headerTemplates.map((template) => (
                <option key={template.documentId} value={template.documentId}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              末尾押註模板
            </label>
            <select
              value={formData.footerDisclaimerTemplateId}
              onChange={(e) => setFormData({ ...formData, footerDisclaimerTemplateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無 --</option>
              {footerTemplates.map((template) => (
                <option key={template.documentId} value={template.documentId}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            排序順序
          </label>
          <input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.requiresAdTemplate}
                onChange={(e) => setFormData({ ...formData, requiresAdTemplate: e.target.checked })}
                className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">需要廣告模板</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 dark:focus:ring-purple-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此預設</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// 作者管理分頁
function AuthorsTab({
  authors,
  addAuthor,
  updateAuthor,
  deleteAuthor,
}: {
  authors: Author[];
  addAuthor: (data: Partial<Author>) => Promise<Author>;
  updateAuthor: (id: string, data: Partial<Author>) => Promise<Author>;
  deleteAuthor: (id: string) => Promise<void>;
}) {
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [showAddAuthor, setShowAddAuthor] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">作者管理</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理文章作者資訊和 WordPress 作者 ID</p>
        </div>
        <Button 
          onClick={() => setShowAddAuthor(true)} 
          variant="solid" 
          color="primary"
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增作者
        </Button>
      </div>

      {showAddAuthor && (
        <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
          <CardHeader>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">新增作者</h4>
          </CardHeader>
          <CardBody>
            <AuthorForm
              onSave={async (data) => {
                await addAuthor(data);
                setShowAddAuthor(false);
              }}
              onCancel={() => setShowAddAuthor(false)}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {authors.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無作者資料</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">點擊上方「新增作者」按鈕開始建立作者資料</p>
            </CardBody>
          </Card>
        ) : (
          authors.map((author: Author) => (
            <ConfigurationCard
              key={author.documentId}
              title={author.displayName}
              subtitle={`帳號: ${author.name}`}
              description={author.description}
              icon={User}
              iconColor="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              isActive={author.isActive}
              isEditing={editingAuthor?.documentId === author.documentId}
              hoverColor="slate"
              tags={[
                ...(author.department ? [{ label: `部門: ${author.department}`, color: '', variant: 'default' as const }] : []),
                ...(author.wordpressId ? [{ label: `WordPress ID: ${author.wordpressId}`, color: '', variant: 'success' as const }] : [])
              ]}
              onEdit={() => setEditingAuthor(author)}
              onDelete={() => {
                if (confirm(`確定要刪除作者「${author.displayName}」嗎？`)) {
                  deleteAuthor(author.documentId);
                }
              }}
            >
              {editingAuthor?.documentId === author.documentId && (
                <AuthorForm
                  author={author}
                  onSave={async (data) => {
                    await updateAuthor(author.documentId, data);
                    setEditingAuthor(null);
                  }}
                  onCancel={() => setEditingAuthor(null)}
                />
              )}
            </ConfigurationCard>
          ))
        )}
      </div>
    </div>
  );
}

// 開頭押註模板分頁
function HeaderTemplatesTab({
  templates,
  addHeaderTemplate,
  updateHeaderTemplate,
  deleteHeaderTemplate,
}: {
  templates: HeaderDisclaimerTemplate[];
  addHeaderTemplate: (data: Partial<HeaderDisclaimerTemplate>) => Promise<HeaderDisclaimerTemplate>;
  updateHeaderTemplate: (id: string, data: Partial<HeaderDisclaimerTemplate>) => Promise<HeaderDisclaimerTemplate>;
  deleteHeaderTemplate: (id: string) => Promise<void>;
}) {
  const [editingTemplate, setEditingTemplate] = useState<HeaderDisclaimerTemplate | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">開頭押註模板</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理文章開頭的押註和免責聲明模板</p>
        </div>
        <Button 
          onClick={() => setShowAddTemplate(true)} 
          variant="solid" 
          color="primary"
          className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增模板
        </Button>
      </div>

      {showAddTemplate && (
        <Card className="border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">新增開頭押註模板</h4>
          </CardHeader>
          <CardBody>
            <HeaderTemplateForm
              onSave={async (data) => {
                await addHeaderTemplate(data);
                setShowAddTemplate(false);
              }}
              onCancel={() => setShowAddTemplate(false)}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無開頭押註模板</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">點擊上方「新增模板」按鈕開始建立開頭押註模板</p>
            </CardBody>
          </Card>
        ) : (
          templates.map((template: HeaderDisclaimerTemplate) => (
            <ConfigurationCard
              key={template.documentId}
              title={template.displayName}
              subtitle={`代碼: ${template.name}`}
              description={template.description}
              icon={MessageSquare}
              iconColor="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
              isActive={template.isActive}
              isEditing={editingTemplate?.documentId === template.documentId}
              hoverColor="green"
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => {
                if (confirm(`確定要刪除模板「${template.displayName}」嗎？`)) {
                  deleteHeaderTemplate(template.documentId);
                }
              }}
            >
              {editingTemplate?.documentId === template.documentId && (
                <HeaderTemplateForm
                  template={template}
                  onSave={async (data) => {
                    await updateHeaderTemplate(template.documentId, data);
                    setEditingTemplate(null);
                  }}
                  onCancel={() => setEditingTemplate(null)}
                />
              )}
              {editingTemplate?.documentId !== template.documentId && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板內容:</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 p-2 rounded border">
                    {template.template || '無內容'}
                  </div>
                </div>
              )}
            </ConfigurationCard>
          ))
        )}
      </div>
    </div>
  );
}

// 末尾押註模板分頁
function FooterTemplatesTab({
  templates,
  addFooterTemplate,
  updateFooterTemplate,
  deleteFooterTemplate,
}: {
  templates: FooterDisclaimerTemplate[];
  addFooterTemplate: (data: Partial<FooterDisclaimerTemplate>) => Promise<FooterDisclaimerTemplate>;
  updateFooterTemplate: (id: string, data: Partial<FooterDisclaimerTemplate>) => Promise<FooterDisclaimerTemplate>;
  deleteFooterTemplate: (id: string) => Promise<void>;
}) {
  const [editingTemplate, setEditingTemplate] = useState<FooterDisclaimerTemplate | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">末尾押註模板</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理文章末尾的押註和廣告模板</p>
        </div>
        <Button 
          onClick={() => setShowAddTemplate(true)} 
          variant="solid" 
          color="primary"
          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增模板
        </Button>
      </div>

      {showAddTemplate && (
        <Card className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <h4 className="text-lg font-semibold text-orange-900 dark:text-orange-100">新增末尾押註模板</h4>
          </CardHeader>
          <CardBody>
            <FooterTemplateForm
              onSave={async (data) => {
                await addFooterTemplate(data);
                setShowAddTemplate(false);
              }}
              onCancel={() => setShowAddTemplate(false)}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardBody className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無末尾押註模板</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">點擊上方「新增模板」按鈕開始建立末尾押註模板</p>
            </CardBody>
          </Card>
        ) : (
          templates.map((template: FooterDisclaimerTemplate) => (
            <ConfigurationCard
              key={template.documentId}
              title={template.displayName}
              subtitle={`代碼: ${template.name}`}
              description={template.description}
              icon={FileText}
              iconColor="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400"
              isActive={template.isActive}
              isEditing={editingTemplate?.documentId === template.documentId}
              hoverColor="orange"
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => {
                if (confirm(`確定要刪除模板「${template.displayName}」嗎？`)) {
                  deleteFooterTemplate(template.documentId);
                }
              }}
            >
              {editingTemplate?.documentId === template.documentId && (
                <FooterTemplateForm
                  template={template}
                  onSave={async (data) => {
                    await updateFooterTemplate(template.documentId, data);
                    setEditingTemplate(null);
                  }}
                  onCancel={() => setEditingTemplate(null)}
                />
              )}
              {editingTemplate?.documentId !== template.documentId && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">模板內容:</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 p-2 rounded border">
                    {template.template || '無內容'}
                  </div>
                </div>
              )}
            </ConfigurationCard>
          ))
        )}
      </div>
    </div>
  );
}

// 作者表單組件
function AuthorForm({ 
  author, 
  onSave, 
  onCancel 
}: { 
  author?: Author; 
  onSave: (data: Partial<Author>) => Promise<void>; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: author?.name || '',
    displayName: author?.displayName || '',
    department: author?.department || '',
    wordpressId: author?.wordpressId || undefined,
    description: author?.description || '',
    isActive: author?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<Author> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.department?.trim()) {
        cleanData.department = formData.department.trim();
      }
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      if (formData.wordpressId && formData.wordpressId > 0) {
        cleanData.wordpressId = formData.wordpressId;
      }
      
      await onSave(cleanData);
      alert('作者資料儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存作者失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              作者帳號 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：john_doe"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="例：約翰・杜"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              部門
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="例：BTEditor"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WordPress 作者 ID
            </label>
            <input
              type="number"
              value={formData.wordpressId?.toString() || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                wordpressId: e.target.value ? Number(e.target.value) : undefined 
              })}
              placeholder="WordPress 系統中的作者 ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述 (可選)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="作者的簡短描述"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此作者</span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// 開頭押註模板表單組件
function HeaderTemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template?: HeaderDisclaimerTemplate;
  onSave: (data: Partial<HeaderDisclaimerTemplate>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    displayName: template?.displayName || '',
    template: template?.template || '',
    description: template?.description || '',
    isActive: template?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<HeaderDisclaimerTemplate> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        template: formData.template.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      await onSave(cleanData);
      alert('開頭押註模板儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存開頭押註模板失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              模板代碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：sponsored"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="例：廣編稿開頭押註"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            模板內容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
            placeholder="例：&lt;span style=&quot;color: #808080;&quot;&gt;&lt;em&gt; 廣編稿&lt;/em&gt;&lt;/span&gt;"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            說明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="這個模板的用途說明"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此模板</span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// 末尾押註模板表單組件
function FooterTemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template?: FooterDisclaimerTemplate;
  onSave: (data: Partial<FooterDisclaimerTemplate>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    displayName: template?.displayName || '',
    template: template?.template || '',
    description: template?.description || '',
    isActive: template?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<FooterDisclaimerTemplate> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        template: formData.template.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      await onSave(cleanData);
      alert('末尾押註模板儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存末尾押註模板失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              模板代碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：sponsored"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="例：廣編稿末尾押註"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            模板內容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
            placeholder="例：&lt;div&gt;商業合作內容，包含完整的免責聲明&lt;/div&gt;"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            說明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="這個模板的用途說明"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-orange-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此模板</span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// WordPress 設定分頁
// 預設內容管理分頁
function ContentTemplatesTab({
  defaultContentSettings,
  updateDefaultContentSettings,
}: {
  defaultContentSettings: DefaultContentSettings | null;
  updateDefaultContentSettings: (data: Partial<DefaultContentSettings>) => Promise<DefaultContentSettings>;
}) {
  // 使用 API 資料，如果沒有資料則使用預設值
  const defaultContent = defaultContentSettings || {
    id: 0,
    documentId: '',
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
    createdAt: '',
    updatedAt: '',
    publishedAt: ''
  };

  const [editingSection, setEditingSection] = useState<'context' | 'background' | 'related' | null>(null);
  const [loading, setLoading] = useState(false);

  // 更新前情提要文章
  const updateContextArticle = async (contextArticle: ArticleLink) => {
    setLoading(true);
    try {
      await updateDefaultContentSettings({ contextArticle });
      setEditingSection(null);
      alert('前情提要文章更新成功！');
    } catch (error) {
      alert('更新失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  // 更新背景補充文章
  const updateBackgroundArticle = async (backgroundArticle: ArticleLink) => {
    setLoading(true);
    try {
      await updateDefaultContentSettings({ backgroundArticle });
      setEditingSection(null);
      alert('背景補充文章更新成功！');
    } catch (error) {
      alert('更新失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  // 更新相關閱讀文章
  const updateRelatedArticles = async (relatedReadingArticles: ArticleLink[]) => {
    setLoading(true);
    try {
      await updateDefaultContentSettings({ relatedReadingArticles });
      setEditingSection(null);
      alert('相關閱讀文章更新成功！');
    } catch (error) {
      alert('更新失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">預設內容管理</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理前情提要、背景補充、相關閱讀的預設文章連結</p>
      </div>

      {!defaultContentSettings ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">載入中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 前情提要文章 */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-orange-500" />
                  前情提要預設文章
                </h4>
                <Button
                  variant="bordered"
                  size="sm"
                  onClick={() => setEditingSection(editingSection === 'context' ? null : 'context')}
                  disabled={loading}
                >
                  {editingSection === 'context' ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      取消
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {editingSection === 'context' ? (
                <ArticleEditForm
                  article={defaultContent.contextArticle}
                  onSave={updateContextArticle}
                  onCancel={() => setEditingSection(null)}
                  color="orange"
                />
              ) : (
                <div className="space-y-3">
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
                </div>
              )}
            </CardBody>
          </Card>

          {/* 背景補充文章 */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  背景補充預設文章
                </h4>
                <Button
                  variant="bordered"
                  size="sm"
                  onClick={() => setEditingSection(editingSection === 'background' ? null : 'background')}
                  disabled={loading}
                >
                  {editingSection === 'background' ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      取消
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {editingSection === 'background' ? (
                <ArticleEditForm
                  article={defaultContent.backgroundArticle}
                  onSave={updateBackgroundArticle}
                  onCancel={() => setEditingSection(null)}
                  color="blue"
                />
              ) : (
                <div className="space-y-3">
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
                </div>
              )}
            </CardBody>
          </Card>

          {/* 相關閱讀文章 */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Layout className="h-5 w-5 mr-2 text-green-500" />
                  相關閱讀預設文章 ({defaultContent.relatedReadingArticles.length})
                </h4>
                <Button
                  variant="bordered"
                  size="sm"
                  onClick={() => setEditingSection(editingSection === 'related' ? null : 'related')}
                  disabled={loading}
                >
                  {editingSection === 'related' ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      取消
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              {editingSection === 'related' ? (
                <RelatedArticlesEditForm
                  articles={defaultContent.relatedReadingArticles}
                  onSave={updateRelatedArticles}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
                <div className="space-y-4">
                  {defaultContent.relatedReadingArticles.map((article, index) => (
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
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}



// 單篇文章編輯表單
function ArticleEditForm({
  article,
  onSave,
  onCancel,
  color = 'gray'
}: {
  article: ArticleLink;
  onSave: (article: ArticleLink) => Promise<void>;
  onCancel: () => void;
  color?: 'orange' | 'blue' | 'gray';
}) {
  const [formData, setFormData] = useState<ArticleLink>(article);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorStyles = {
    orange: 'border-orange-300 dark:border-orange-600 focus:ring-orange-500',
    blue: 'border-blue-300 dark:border-blue-600 focus:ring-blue-500',
    gray: 'border-gray-300 dark:border-gray-600 focus:ring-gray-500'
  };

  const buttonStyles = {
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    gray: 'bg-gray-600 hover:bg-gray-700 text-white'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 過濾掉 id 欄位，只保留 title 和 url
      const { title, url } = formData;
      await onSave({ title, url });
    } catch (error) {
      setError(error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      <div>
        <label htmlFor="article-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          文章標題
        </label>
        <input
          id="article-title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${colorStyles[color]}`}
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          文章網址
        </label>
        <input
          id="article-url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${colorStyles[color]}`}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 ${buttonStyles[color]}`}
        >
          <Save className="h-4 w-4 mr-2 inline" />
          {isSubmitting ? '儲存中...' : '儲存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}

// 相關閱讀文章編輯表單
function RelatedArticlesEditForm({
  articles,
  onSave,
  onCancel,
}: {
  articles: ArticleLink[];
  onSave: (articles: ArticleLink[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ArticleLink[]>(articles);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addArticle = () => {
    setFormData(prev => [...prev, { title: '', url: '' }]);
  };

  const removeArticle = (index: number) => {
    setFormData(prev => prev.filter((_, i) => i !== index));
  };

  const updateArticle = (index: number, field: keyof ArticleLink, value: string) => {
    setFormData(prev => prev.map((article, i) => 
      i === index ? { ...article, [field]: value } : article
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 過濾掉每個文章的 id 欄位，只保留 title 和 url
      const cleanedFormData = formData.map(({ title, url }) => ({ title, url }));
      await onSave(cleanedFormData);
    } catch (error) {
      setError(error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h5 className="text-md font-semibold text-gray-900 dark:text-gray-100">編輯相關閱讀文章</h5>
        <button
          type="button"
          onClick={addArticle}
          disabled={isSubmitting}
          className="px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-1 inline" />
          新增文章
        </button>
      </div>

      <div className="space-y-4">
        {formData.map((article, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">文章 {index + 1}</span>
              <button
                type="button"
                onClick={() => removeArticle(index)}
                disabled={isSubmitting}
                aria-label={`刪除文章 ${index + 1}`}
                className="px-2 py-1 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor={`related-title-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  文章標題
                </label>
                <input
                  id={`related-title-${index}`}
                  type="text"
                  value={article.title}
                  onChange={(e) => updateArticle(index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor={`related-url-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  文章網址
                </label>
                <input
                  id={`related-url-${index}`}
                  type="url"
                  value={article.url}
                  onChange={(e) => updateArticle(index, 'url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2 inline" />
          {isSubmitting ? '儲存中...' : '儲存所有文章'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}

// 內容模板類型定義（已移除，因為不再需要） 