'use client';

import React, { useState } from 'react';
import { useConfigManagement } from '@/hooks/useConfigManagement';
import { Button } from '@/components/ui/button/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/card/Card';
import { Trash2, Edit, Plus, Save, X, User, FileText, Settings, RefreshCw } from 'lucide-react';
import { Author, ArticleTemplate, WordPressSettings } from '@/services/strapi';

export function ConfigurationPanel() {
  const {
    authors,
    templates,
    wordpressSettings,
    loading,
    error,
    addAuthor,
    updateAuthor,
    deleteAuthor,
    addTemplate,
    updateTemplate,
    updateWordPressSettings,
    reload,
  } = useConfigManagement();

  const [activeTab, setActiveTab] = useState<'authors' | 'templates' | 'wordpress'>('authors');
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ArticleTemplate | null>(null);
  const [showAddAuthor, setShowAddAuthor] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

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
          <p className="text-gray-600 dark:text-gray-400 mt-1">動態管理作者、文稿模板和發布設定</p>
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

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardBody className="p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">作者管理</h3>
                <p className="text-blue-700 dark:text-blue-300">共 {authors.length} 位作者</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardBody className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">文稿模板</h3>
                <p className="text-green-700 dark:text-green-300">共 {templates.length} 個模板</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <CardBody className="p-4">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">WordPress 設定</h3>
                <p className="text-purple-700 dark:text-purple-300">{wordpressSettings ? '已配置' : '未配置'}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 分頁標籤 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 p-1">
            {[
              { id: 'authors', label: '作者管理', icon: User },
              { id: 'templates', label: '文稿模板', icon: FileText },
              { id: 'wordpress', label: 'WordPress 設定', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'authors' | 'templates' | 'wordpress')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === id 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'authors' && (
            <AuthorsTab
              authors={authors}
              editingAuthor={editingAuthor}
              setEditingAuthor={setEditingAuthor}
              showAddAuthor={showAddAuthor}
              setShowAddAuthor={setShowAddAuthor}
              addAuthor={addAuthor}
              updateAuthor={updateAuthor}
              deleteAuthor={deleteAuthor}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              authors={authors}
              editingTemplate={editingTemplate}
              setEditingTemplate={setEditingTemplate}
              showAddTemplate={showAddTemplate}
              setShowAddTemplate={setShowAddTemplate}
              addTemplate={addTemplate}
              updateTemplate={updateTemplate}
            />
          )}

          {activeTab === 'wordpress' && (
            <WordPressTab
              settings={wordpressSettings}
              onSave={updateWordPressSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 作者管理分頁
function AuthorsTab({
  authors,
  editingAuthor,
  setEditingAuthor,
  showAddAuthor,
  setShowAddAuthor,
  addAuthor,
  updateAuthor,
  deleteAuthor,
}: {
  authors: Author[];
  editingAuthor: Author | null;
  setEditingAuthor: (author: Author | null) => void;
  showAddAuthor: boolean;
  setShowAddAuthor: (show: boolean) => void;
  addAuthor: (data: Partial<Author>) => Promise<Author>;
  updateAuthor: (id: string, data: Partial<Author>) => Promise<Author>;
  deleteAuthor: (id: string) => Promise<void>;
}) {
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
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增作者
        </Button>
      </div>

      {showAddAuthor && (
        <Card className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">新增作者</h4>
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
            <Card key={author.documentId} className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
              <CardBody>
                {editingAuthor?.documentId === author.documentId ? (
                  <AuthorForm
                    author={author}
                    onSave={async (data) => {
                      await updateAuthor(author.documentId, data);
                      setEditingAuthor(null);
                    }}
                    onCancel={() => setEditingAuthor(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{author.displayName}</h4>
                        <p className="text-gray-600 dark:text-gray-400">帳號: {author.name}</p>
                        {author.department && (
                          <p className="text-sm text-blue-600 dark:text-blue-400">部門: {author.department}</p>
                        )}
                        {author.wordpressId && (
                          <p className="text-sm text-green-600 dark:text-green-400">WordPress ID: {author.wordpressId}</p>
                        )}
                        <p className={`text-xs ${author.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {author.isActive ? '✓ 啟用中' : '✗ 已停用'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="bordered"
                        size="sm"
                        onClick={() => setEditingAuthor(author)}
                        className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                      <Button
                        variant="bordered"
                        size="sm"
                        color="danger"
                        onClick={() => {
                          if (confirm(`確定要刪除作者「${author.displayName}」嗎？`)) {
                            deleteAuthor(author.documentId);
                          }
                        }}
                        className="border-red-200 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// 文稿模板分頁
function TemplatesTab({
  templates,
  authors,
  editingTemplate,
  setEditingTemplate,
  showAddTemplate,
  setShowAddTemplate,
  addTemplate,
  updateTemplate,
}: {
  templates: ArticleTemplate[];
  authors: Author[];
  editingTemplate: ArticleTemplate | null;
  setEditingTemplate: (template: ArticleTemplate | null) => void;
  showAddTemplate: boolean;
  setShowAddTemplate: (show: boolean) => void;
  addTemplate: (data: Partial<ArticleTemplate>) => Promise<ArticleTemplate>;
  updateTemplate: (id: string, data: Partial<ArticleTemplate>) => Promise<ArticleTemplate>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">文稿模板</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理不同類型文章的格式模板</p>
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
            <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">新增文稿模板</h4>
          </CardHeader>
          <CardBody>
            <TemplateForm
              authors={authors}
              onSave={async (data) => {
                await addTemplate(data);
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
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">尚無模板資料</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">點擊上方「新增模板」按鈕開始建立文稿模板</p>
            </CardBody>
          </Card>
        ) : (
          templates.map((template: ArticleTemplate) => (
            <Card key={template.documentId} className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600 transition-colors">
              <CardBody>
                {editingTemplate?.documentId === template.documentId ? (
                  <TemplateForm
                    template={template}
                    authors={authors}
                    onSave={async (data) => {
                      await updateTemplate(template.documentId, data);
                      setEditingTemplate(null);
                    }}
                    onCancel={() => setEditingTemplate(null)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                          <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{template.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${template.type === 'sponsored' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 
                                template.type === 'news' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 
                                'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'}`}>
                              {template.type === 'sponsored' ? '廣編稿' : 
                               template.type === 'news' ? '新聞稿' : '評測'}
                            </span>
                            <span className={`text-xs ${template.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {template.isActive ? '✓ 啟用' : '✗ 停用'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="bordered"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="border-green-200 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                    </div>
                    
                    {template.headerNote && (
                      <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>標頭註解:</strong> {template.headerNote}
                        </p>
                      </div>
                    )}
                    
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 select-none">
                        <span className="group-open:hidden">▶ 查看 Footer HTML</span>
                        <span className="hidden group-open:inline">▼ 隱藏 Footer HTML</span>
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                        {template.footerHtml || '無內容'}
                      </div>
                    </details>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// WordPress 設定分頁
function WordPressTab({
  settings,
  onSave,
}: {
  settings: WordPressSettings | null;
  onSave: (data: Partial<WordPressSettings>) => Promise<WordPressSettings>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">WordPress 發布設定</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">配置 WordPress 自動發布的預設參數</p>
      </div>

      <Card className="border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950">
        <CardHeader>
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
            <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">發布配置</h4>
          </div>
        </CardHeader>
        <CardBody>
          <WordPressSettingsForm settings={settings} onSave={onSave} />
        </CardBody>
      </Card>
    </div>
  );
}

// 作者表單組件 (使用原生 HTML 表單避免樣式衝突)
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
      // 清理資料：移除 undefined 值
      const cleanData: Partial<Author> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
      };
      
      // 只有非空值才加入
      if (formData.department?.trim()) {
        cleanData.department = formData.department.trim();
      }
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      if (formData.wordpressId && formData.wordpressId > 0) {
        cleanData.wordpressId = formData.wordpressId;
      }
      
      console.log('提交作者資料:', cleanData);
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
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

// 模板表單組件 (使用原生 HTML 表單避免樣式衝突)
function TemplateForm({ 
  template, 
  authors, 
  onSave, 
  onCancel 
}: { 
  template?: ArticleTemplate; 
  authors: Author[]; 
  onSave: (data: Partial<ArticleTemplate>) => Promise<void>; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'sponsored' as const,
    footerHtml: template?.footerHtml || '',
    footerAdvertising: template?.footerAdvertising || '',
    headerNote: template?.headerNote || '',
    defaultAuthorId: template?.defaultAuthor?.documentId || '',
    isActive: template?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 清理資料：移除 defaultAuthorId 如果為空
      const cleanData: Partial<ArticleTemplate> = {
        name: formData.name,
        type: formData.type,
        footerHtml: formData.footerHtml,
        footerAdvertising: formData.footerAdvertising || '',
        headerNote: formData.headerNote || '',
        isActive: formData.isActive
      };
      
      console.log('提交模板資料:', cleanData);
      await onSave(cleanData);
      alert('模板儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(`儲存模板失敗: ${errorMessage}`);
      console.error('儲存模板失敗:', err);
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
              模板名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：廣編稿模板 v1"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label htmlFor="template-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              文稿類型 <span className="text-red-500">*</span>
            </label>
            <select
              id="template-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'sponsored' | 'news' | 'review' })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="sponsored">廣編稿 (Sponsored)</option>
              <option value="news">新聞稿 (News)</option>
              <option value="review">評測 (Review)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            標頭註解
          </label>
          <input
            type="text"
            value={formData.headerNote}
            onChange={(e) => setFormData({ ...formData, headerNote: e.target.value })}
            placeholder="例：免責聲明或特殊標記"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Footer HTML 模板
          </label>
          <textarea
            value={formData.footerHtml}
            onChange={(e) => setFormData({ ...formData, footerHtml: e.target.value })}
            placeholder="文章結尾的 HTML 內容..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            押註模板 (可選)
          </label>
          <textarea
            value={formData.footerAdvertising}
            onChange={(e) => setFormData({ ...formData, footerAdvertising: e.target.value })}
            placeholder="廣告或推廣內容..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        <div>
          <label htmlFor="default-author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            預設作者 (可選)
          </label>
          <select
            id="default-author"
            value={formData.defaultAuthorId}
            onChange={(e) => setFormData({ ...formData, defaultAuthorId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">-- 選擇預設作者 --</option>
            {authors.map((author) => (
              <option key={author.documentId} value={author.documentId}>
                {author.displayName} ({author.name})
              </option>
            ))}
          </select>
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

// WordPress 設定表單組件 (使用原生 HTML 表單避免樣式衝突)
function WordPressSettingsForm({ 
  settings, 
  onSave 
}: { 
  settings: WordPressSettings | null; 
  onSave: (data: Partial<WordPressSettings>) => Promise<WordPressSettings>; 
}) {
  const [formData, setFormData] = useState({
    siteName: settings?.siteName || '',
    siteUrl: settings?.siteUrl || '',
    defaultCategory: settings?.defaultCategory || '',
    defaultTags: settings?.defaultTags || '',
    defaultStatus: settings?.defaultStatus || 'draft' as const,
    autoPublish: settings?.autoPublish ?? false,
    featuredImageRequired: settings?.featuredImageRequired ?? false,
    customFooterHtml: settings?.customFooterHtml || '',
    metaDescription: settings?.metaDescription || '',
    isActive: settings?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      await onSave(formData);
      setSuccess(true);
      alert('WordPress 設定儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(`儲存 WordPress 設定失敗: ${errorMessage}`);
      console.error('儲存 WordPress 設定失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-6">基本資訊</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              網站名稱
            </label>
            <input
              type="text"
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              placeholder="動區 BlockTempo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              網站 URL
            </label>
            <input
              type="url"
              value={formData.siteUrl}
              onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
              placeholder="https://blocktempo.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-6">發布預設值</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設分類
            </label>
            <input
              type="text"
              value={formData.defaultCategory}
              onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
              placeholder="Blockchain Media"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設標籤
            </label>
            <input
              type="text"
              value={formData.defaultTags}
              onChange={(e) => setFormData({ ...formData, defaultTags: e.target.value })}
              placeholder="標籤1,標籤2,標籤3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="default-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            預設發布狀態
          </label>
          <select
            id="default-status"
            value={formData.defaultStatus}
            onChange={(e) => setFormData({ ...formData, defaultStatus: e.target.value as 'draft' | 'pending' | 'publish' | 'private' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="draft">草稿 (Draft)</option>
            <option value="pending">待審核 (Pending)</option>
            <option value="publish">立即發布 (Publish)</option>
            <option value="private">私密 (Private)</option>
          </select>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.autoPublish}
              onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })}
              className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">自動發布到 WordPress</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.featuredImageRequired}
              onChange={(e) => setFormData({ ...formData, featuredImageRequired: e.target.checked })}
              className="w-4 h-4 text-yellow-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">需要特色圖片</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 dark:focus:ring-purple-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用這些設定</span>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-6">自訂內容</h5>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自訂 Footer HTML
            </label>
            <textarea
              value={formData.customFooterHtml}
              onChange={(e) => setFormData({ ...formData, customFooterHtml: e.target.value })}
              placeholder="<div>自訂的頁尾內容...</div>"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meta 描述模板
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              placeholder="網站的預設 Meta 描述內容"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500 resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
          <p className="text-sm text-green-600 dark:text-green-400">設定儲存成功！</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
      >
        <Save className="h-5 w-5 mr-2 inline" />
        {isSubmitting ? '儲存中...' : '儲存 WordPress 設定'}
      </button>
    </form>
  );
} 