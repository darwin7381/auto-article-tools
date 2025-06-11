'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  authorsApi, 
  headerDisclaimerTemplatesApi,
  footerDisclaimerTemplatesApi,
  articleTypePresetsApi,
  defaultContentSettingsApi,
  configApi,
  Author, 
  HeaderDisclaimerTemplate,
  FooterDisclaimerTemplate,
  ArticleTypePreset,
  DefaultContentSettings,
  // 向後兼容
  ArticleTemplate
} from '@/services/strapi';

interface ConfigState {
  authors: Author[];
  headerTemplates: HeaderDisclaimerTemplate[];
  footerTemplates: FooterDisclaimerTemplate[];
  articlePresets: ArticleTypePreset[];
  defaultContentSettings: DefaultContentSettings | null;
  loading: boolean;
  error: string | null;
}

export function useConfigManagement() {
  const [state, setState] = useState<ConfigState>({
    authors: [],
    headerTemplates: [],
    footerTemplates: [],
    articlePresets: [],
    defaultContentSettings: null,
    loading: true,
    error: null,
  });

  // 載入所有配置數據
  const loadConfigs = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const configs = await configApi.getAllConfigs();

      setState({
        authors: configs.authors,
        headerTemplates: configs.headerTemplates,
        footerTemplates: configs.footerTemplates,
        articlePresets: configs.articlePresets,
        defaultContentSettings: configs.defaultContentSettings,
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

  // === 作者管理 ===
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

  // === 開頭押註模板管理 ===
  const addHeaderTemplate = useCallback(async (templateData: Partial<HeaderDisclaimerTemplate>) => {
    try {
      const response = await headerDisclaimerTemplatesApi.create(templateData);
      setState(prev => ({
        ...prev,
        headerTemplates: [...prev.headerTemplates, response.data],
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '新增開頭押註模板失敗');
    }
  }, []);

  const updateHeaderTemplate = useCallback(async (id: string, templateData: Partial<HeaderDisclaimerTemplate>) => {
    try {
      const response = await headerDisclaimerTemplatesApi.update(id, templateData);
      setState(prev => ({
        ...prev,
        headerTemplates: prev.headerTemplates.map(template => 
          template.documentId === id ? response.data : template
        ),
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新開頭押註模板失敗');
    }
  }, []);

  const deleteHeaderTemplate = useCallback(async (id: string) => {
    try {
      await headerDisclaimerTemplatesApi.delete(id);
      setState(prev => ({
        ...prev,
        headerTemplates: prev.headerTemplates.filter(template => template.documentId !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '刪除開頭押註模板失敗');
    }
  }, []);

  // === 末尾押註模板管理 ===
  const addFooterTemplate = useCallback(async (templateData: Partial<FooterDisclaimerTemplate>) => {
    try {
      const response = await footerDisclaimerTemplatesApi.create(templateData);
      setState(prev => ({
        ...prev,
        footerTemplates: [...prev.footerTemplates, response.data],
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '新增末尾押註模板失敗');
    }
  }, []);

  const updateFooterTemplate = useCallback(async (id: string, templateData: Partial<FooterDisclaimerTemplate>) => {
    try {
      const response = await footerDisclaimerTemplatesApi.update(id, templateData);
      setState(prev => ({
        ...prev,
        footerTemplates: prev.footerTemplates.map(template => 
          template.documentId === id ? response.data : template
        ),
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新末尾押註模板失敗');
    }
  }, []);

  const deleteFooterTemplate = useCallback(async (id: string) => {
    try {
      await footerDisclaimerTemplatesApi.delete(id);
      setState(prev => ({
        ...prev,
        footerTemplates: prev.footerTemplates.filter(template => template.documentId !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '刪除末尾押註模板失敗');
    }
  }, []);

  // === 文稿類型預設管理 ===
  const addArticlePreset = useCallback(async (presetData: Partial<ArticleTypePreset>) => {
    try {
      const response = await articleTypePresetsApi.create(presetData);
      
      // 新增後重新載入完整數據以確保關聯字段正確並保持排序
      const updatedConfigs = await configApi.getAllConfigs();
      setState(prev => ({
        ...prev,
        articlePresets: updatedConfigs.articlePresets,
        authors: updatedConfigs.authors,
        headerTemplates: updatedConfigs.headerTemplates,
        footerTemplates: updatedConfigs.footerTemplates,
      }));
      
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '新增文稿類型預設失敗');
    }
  }, []);

  const updateArticlePreset = useCallback(async (id: string, presetData: Partial<ArticleTypePreset>) => {
    try {
      const response = await articleTypePresetsApi.update(id, presetData);
      
      // 更新後重新載入完整數據以確保關聯字段正確
      const updatedConfigs = await configApi.getAllConfigs();
      setState(prev => ({
        ...prev,
        articlePresets: updatedConfigs.articlePresets,
        authors: updatedConfigs.authors,
        headerTemplates: updatedConfigs.headerTemplates,
        footerTemplates: updatedConfigs.footerTemplates,
      }));
      
      // 返回更新後的完整數據
      const updatedPreset = updatedConfigs.articlePresets.find(p => p.documentId === id);
      return updatedPreset || response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新文稿類型預設失敗');
    }
  }, []);

  const deleteArticlePreset = useCallback(async (id: string) => {
    try {
      await articleTypePresetsApi.delete(id);
      setState(prev => ({
        ...prev,
        articlePresets: prev.articlePresets.filter(preset => preset.documentId !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '刪除文稿類型預設失敗');
    }
  }, []);

  // === WordPress 設定管理 已移除（使用現有的 WordPress 功能）===

  // === 預設內容設定管理 ===
  const updateDefaultContentSettings = useCallback(async (settingsData: Partial<DefaultContentSettings>) => {
    try {
      const response = await defaultContentSettingsApi.update(settingsData);
      setState(prev => ({
        ...prev,
        defaultContentSettings: response.data,
      }));
      return response.data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新預設內容設定失敗');
    }
  }, []);

  // === 查詢功能 ===
  // 根據部門獲取作者
  const getAuthorsByDepartment = useCallback((department: string) => {
    return state.authors.filter(author => author.department === department && author.isActive);
  }, [state.authors]);

  // 根據代碼獲取文稿類型預設
  const getPresetByCode = useCallback((code: string) => {
    return state.articlePresets.find(preset => preset.code === code && preset.isActive);
  }, [state.articlePresets]);

  // === 向後兼容 ===
  // 模擬舊的模板 API（將 ArticleTypePreset 轉換為 ArticleTemplate）
  const templates: ArticleTemplate[] = state.articlePresets.map(preset => ({
    ...preset,
    type: preset.code, // code 映射到 type
    footerHtml: preset.footerDisclaimerTemplate?.template || '',
    footerAdvertising: '',
    headerNote: preset.headerDisclaimerTemplate?.template || '',
  }));

  const addTemplate = useCallback(async (templateData: Partial<ArticleTemplate>) => {
    // 轉換舊的模板資料到新的預設格式
    const presetData: Partial<ArticleTypePreset> = {
      name: templateData.name,
      code: templateData.type || 'general',
      requiresAdTemplate: templateData.type === 'sponsored',
      isActive: templateData.isActive,
      sortOrder: 0,
    };
    
    return addArticlePreset(presetData);
  }, [addArticlePreset]);

  const updateTemplate = useCallback(async (id: string, templateData: Partial<ArticleTemplate>) => {
    // 轉換舊的模板資料到新的預設格式
    const presetData: Partial<ArticleTypePreset> = {
      name: templateData.name,
      code: templateData.type,
      requiresAdTemplate: templateData.type === 'sponsored',
      isActive: templateData.isActive,
    };
    
    return updateArticlePreset(id, presetData);
  }, [updateArticlePreset]);

  const getTemplatesByType = useCallback((type: string) => {
    return templates.filter(template => template.type === type && template.isActive);
  }, [templates]);

  // 初始化載入
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    // === 狀態 ===
    ...state,
    templates, // 向後兼容
    
    // === 重新載入 ===
    reload: loadConfigs,
    
    // === 作者管理 ===
    addAuthor,
    updateAuthor,
    deleteAuthor,
    getAuthorsByDepartment,
    
    // === 開頭押註模板管理 ===
    addHeaderTemplate,
    updateHeaderTemplate,
    deleteHeaderTemplate,
    
    // === 末尾押註模板管理 ===
    addFooterTemplate,
    updateFooterTemplate,
    deleteFooterTemplate,
    
    // === 文稿類型預設管理 ===
    addArticlePreset,
    updateArticlePreset,
    deleteArticlePreset,
    getPresetByCode,
    
    // === 預設內容設定管理 ===
    updateDefaultContentSettings,
    
    // === 向後兼容 ===
    addTemplate,
    updateTemplate,
    getTemplatesByType,
  };
} 