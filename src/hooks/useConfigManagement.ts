'use client';

import { useState, useEffect, useCallback } from 'react';
import { authorsApi, templatesApi, wordpressSettingsApi, Author, ArticleTemplate, WordPressSettings } from '@/services/strapi';

interface ConfigState {
  authors: Author[];
  templates: ArticleTemplate[];
  wordpressSettings: WordPressSettings | null;
  loading: boolean;
  error: string | null;
}

export function useConfigManagement() {
  const [state, setState] = useState<ConfigState>({
    authors: [],
    templates: [],
    wordpressSettings: null,
    loading: true,
    error: null,
  });

  // 載入所有配置數據
  const loadConfigs = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [authorsRes, templatesRes, wpSettingsRes] = await Promise.allSettled([
        authorsApi.getAll(),
        templatesApi.getAll(),
        wordpressSettingsApi.get(),
      ]);

      const authors = authorsRes.status === 'fulfilled' ? authorsRes.value.data : [];
      const templates = templatesRes.status === 'fulfilled' ? templatesRes.value.data : [];
      const wordpressSettings = wpSettingsRes.status === 'fulfilled' ? wpSettingsRes.value.data : null;

      setState({
        authors,
        templates,
        wordpressSettings,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '載入配置失敗',
      }));
    }
  }, []);

  // 作者管理
  const addAuthor = useCallback(async (authorData: Partial<Author>) => {
    try {
      const response = await authorsApi.create(authorData);
      setState(prev => ({
        ...prev,
        authors: [...prev.authors, response.data],
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '新增作者失敗');
    }
  }, []);

  const updateAuthor = useCallback(async (id: string, authorData: Partial<Author>) => {
    try {
      const response = await authorsApi.update(id, authorData);
      setState(prev => ({
        ...prev,
        authors: prev.authors.map(author => 
          author.documentId === id ? response.data : author
        ),
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新作者失敗');
    }
  }, []);

  const deleteAuthor = useCallback(async (id: string) => {
    try {
      await authorsApi.delete(id);
      setState(prev => ({
        ...prev,
        authors: prev.authors.filter(author => author.documentId !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '刪除作者失敗');
    }
  }, []);

  // 模板管理
  const addTemplate = useCallback(async (templateData: Partial<ArticleTemplate>) => {
    try {
      const response = await templatesApi.create(templateData);
      setState(prev => ({
        ...prev,
        templates: [...prev.templates, response.data],
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '新增模板失敗');
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, templateData: Partial<ArticleTemplate>) => {
    try {
      const response = await templatesApi.update(id, templateData);
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(template => 
          template.documentId === id ? response.data : template
        ),
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新模板失敗');
    }
  }, []);

  // WordPress 設定管理
  const updateWordPressSettings = useCallback(async (settingsData: Partial<WordPressSettings>) => {
    try {
      const response = await wordpressSettingsApi.update(settingsData);
      setState(prev => ({
        ...prev,
        wordpressSettings: response.data,
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新 WordPress 設定失敗');
    }
  }, []);

  // 根據類型獲取作者
  const getAuthorsByDepartment = useCallback((department: string) => {
    return state.authors.filter(author => author.department === department && author.isActive);
  }, [state.authors]);

  // 根據類型獲取模板
  const getTemplatesByType = useCallback((type: string) => {
    return state.templates.filter(template => template.type === type && template.isActive);
  }, [state.templates]);

  // 初始化載入
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    // 狀態
    ...state,
    
    // 重新載入
    reload: loadConfigs,
    
    // 作者管理
    addAuthor,
    updateAuthor,
    deleteAuthor,
    getAuthorsByDepartment,
    
    // 模板管理
    addTemplate,
    updateTemplate,
    getTemplatesByType,
    
    // WordPress 設定管理
    updateWordPressSettings,
  };
} 