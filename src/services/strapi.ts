// Strapi 5 服務 - 使用原生 fetch API（重構版，支援組合式配置系統）

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// 通用 API 請求函數
async function strapiApi<T>(endpoint: string, options?: RequestInit): Promise<StrapiResponse<T>> {
  const url = `${STRAPI_URL}/api${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  try {
    console.log('Strapi API 請求:', {
      url,
      method: config.method || 'GET',
      body: config.body
    });
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorDetail;
      try {
        errorDetail = await response.text();
        console.error('Strapi API 錯誤回應:', errorDetail);
      } catch {
        errorDetail = `HTTP ${response.status}`;
      }
      throw new Error(`HTTP error! status: ${response.status}, detail: ${errorDetail}`);
    }
    
    // 檢查響應是否有內容
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    // 如果是 DELETE 請求且沒有內容，返回空的成功響應
    if (config.method === 'DELETE' && (contentLength === '0' || !contentType?.includes('application/json'))) {
      return { data: null } as StrapiResponse<T>;
    }
    
    // 如果響應內容長度為 0，返回空的成功響應
    if (contentLength === '0') {
      return { data: null } as StrapiResponse<T>;
    }
    
    // 嘗試解析 JSON，如果失敗則檢查是否是空響應
    const text = await response.text();
    if (!text.trim()) {
      return { data: null } as StrapiResponse<T>;
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 解析錯誤:', parseError, '響應內容:', text);
      throw new Error(`無法解析響應 JSON: ${parseError}`);
    }
  } catch (error) {
    console.error('Strapi API 錯誤:', error);
    throw error;
  }
}

// 作者相關 API
export const authorsApi = {
  // 獲取所有作者
  async getAll() {
    return strapiApi<Author[]>('/authors');
  },

  // 根據 ID 獲取作者
  async getById(id: string) {
    return strapiApi<Author>(`/authors/${id}`);
  },

  // 創建作者
  async create(data: Partial<Author>) {
    return strapiApi<Author>('/authors', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  // 更新作者
  async update(id: string, data: Partial<Author>) {
    return strapiApi<Author>(`/authors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  },

  // 刪除作者
  async delete(id: string) {
    return strapiApi<Author>(`/authors/${id}`, {
      method: 'DELETE',
    });
  },
};

// 開頭押註模板相關 API
export const headerDisclaimerTemplatesApi = {
  // 獲取所有開頭押註模板
  async getAll() {
    return strapiApi<HeaderDisclaimerTemplate[]>('/header-disclaimer-templates');
  },

  // 根據 ID 獲取模板
  async getById(id: string) {
    return strapiApi<HeaderDisclaimerTemplate>(`/header-disclaimer-templates/${id}`);
  },

  // 創建模板
  async create(data: Partial<HeaderDisclaimerTemplate>) {
    return strapiApi<HeaderDisclaimerTemplate>('/header-disclaimer-templates', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  // 更新模板
  async update(id: string, data: Partial<HeaderDisclaimerTemplate>) {
    return strapiApi<HeaderDisclaimerTemplate>(`/header-disclaimer-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  },

  // 刪除模板
  async delete(id: string) {
    return strapiApi<HeaderDisclaimerTemplate>(`/header-disclaimer-templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// 末尾押註模板相關 API
export const footerDisclaimerTemplatesApi = {
  // 獲取所有末尾押註模板
  async getAll() {
    return strapiApi<FooterDisclaimerTemplate[]>('/footer-disclaimer-templates');
  },

  // 根據 ID 獲取模板
  async getById(id: string) {
    return strapiApi<FooterDisclaimerTemplate>(`/footer-disclaimer-templates/${id}`);
  },

  // 創建模板
  async create(data: Partial<FooterDisclaimerTemplate>) {
    return strapiApi<FooterDisclaimerTemplate>('/footer-disclaimer-templates', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  // 更新模板
  async update(id: string, data: Partial<FooterDisclaimerTemplate>) {
    return strapiApi<FooterDisclaimerTemplate>(`/footer-disclaimer-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  },

  // 刪除模板
  async delete(id: string) {
    return strapiApi<FooterDisclaimerTemplate>(`/footer-disclaimer-templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// 文稿類型預設相關 API
export const articleTypePresetsApi = {
  // 獲取所有文稿類型預設（包含關聯資料）
  async getAll() {
    return strapiApi<ArticleTypePreset[]>('/article-type-presets?populate=*');
  },

  // 根據 ID 獲取預設
  async getById(id: string) {
    return strapiApi<ArticleTypePreset>(`/article-type-presets/${id}?populate=*`);
  },

  // 根據 code 獲取預設
  async getByCode(code: string) {
    return strapiApi<ArticleTypePreset[]>(`/article-type-presets?filters[code][$eq]=${code}&populate=*`);
  },

  // 創建文稿類型預設
  async create(data: Partial<ArticleTypePreset>) {
    const response = await strapiApi<ArticleTypePreset>('/article-type-presets', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    // 創建後使用 populate 重新獲取完整數據
    return this.getById(response.data.documentId);
  },

  // 更新文稿類型預設
  async update(id: string, data: Partial<ArticleTypePreset>) {
    await strapiApi<ArticleTypePreset>(`/article-type-presets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    // 更新後使用 populate 重新獲取完整數據
    return this.getById(id);
  },

  // 刪除文稿類型預設
  async delete(id: string) {
    return strapiApi<ArticleTypePreset>(`/article-type-presets/${id}`, {
      method: 'DELETE',
    });
  },
};

// WordPress 設定相關 API 已移除（使用現有的 WordPress 功能）

// 預設內容設定相關 API
export const defaultContentSettingsApi = {
  // 獲取預設內容設定
  async get() {
    try {
      const response = await strapiApi<DefaultContentSettings>('/default-content-setting?populate=*');
      console.log('Default content settings API response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching default content settings:', error);
      throw error;
    }
  },

  // 更新預設內容設定
  async update(data: Partial<DefaultContentSettings>) {
    try {
      // 過濾掉 Strapi 系統字段，只保留業務數據
      const filteredData = {
        contextArticle: data.contextArticle,
        backgroundArticle: data.backgroundArticle,
        relatedReadingArticles: data.relatedReadingArticles,
        isActive: data.isActive,
      };
      
      console.log('Updating default content settings with filtered data:', filteredData);
      await strapiApi<DefaultContentSettings>('/default-content-setting', {
        method: 'PUT',
        body: JSON.stringify({ data: filteredData }),
      });
      // 更新後重新取得完整資料
      const response = await strapiApi<DefaultContentSettings>('/default-content-setting?populate=*');
      console.log('Updated data with populate:', response);
      return response;
    } catch (error) {
      console.error('Error updating default content settings:', error);
      throw error;
    }
  },
};

// 向後兼容：保留舊的 templatesApi，但指向新的 Article Type Presets
export const templatesApi = articleTypePresetsApi;

// 類型定義
export interface Author {
  id: number;
  documentId: string;
  name: string;
  displayName: string;
  wordpressId?: number;
  department?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface HeaderDisclaimerTemplate {
  id: number;
  documentId: string;
  name: string;
  displayName: string;
  template: string;
  description?: string;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface FooterDisclaimerTemplate {
  id: number;
  documentId: string;
  name: string;
  displayName: string;
  template: string;
  description?: string;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ArticleTypePreset {
  id: number;
  documentId: string;
  name: string;
  code: string;
  description?: string;
  defaultAuthor?: Author;
  headerDisclaimerTemplate?: HeaderDisclaimerTemplate;
  footerDisclaimerTemplate?: FooterDisclaimerTemplate;
  requiresAdTemplate: boolean;
  advancedSettings?: Record<string, unknown>;
  isSystemDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// 向後兼容：保留舊的 ArticleTemplate 型別，但映射到新的結構
export interface ArticleTemplate extends Omit<ArticleTypePreset, 'code' | 'sortOrder'> {
  type: string; // 映射到 code
}

// WordPress 設定類型已移除（使用現有的 WordPress 功能）

// 預設內容設定相關類型
export interface ArticleLink {
  id?: number;
  title: string;
  url: string;
}

export interface DefaultContentSettings {
  id: number;
  documentId: string;
  contextArticle: ArticleLink;
  backgroundArticle: ArticleLink;
  relatedReadingArticles: ArticleLink[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// 便利函數
export const configApi = {
  // 獲取所有配置資料
  async getAllConfigs() {
    const [authorsRes, headerTemplatesRes, footerTemplatesRes, articlePresetsRes, defaultContentRes] = await Promise.allSettled([
      authorsApi.getAll(),
      headerDisclaimerTemplatesApi.getAll(),
      footerDisclaimerTemplatesApi.getAll(),
      articleTypePresetsApi.getAll(),
      defaultContentSettingsApi.get(),
    ]);

    // 靜默處理失敗的請求，避免在控制台顯示錯誤
    if (defaultContentRes.status === 'rejected') {
      console.warn('預設內容設定 API 暫時無法訪問，將使用預設值');
    }

    return {
      authors: authorsRes.status === 'fulfilled' ? authorsRes.value.data.sort((a, b) => a.displayName.localeCompare(b.displayName)) : [],
      headerTemplates: headerTemplatesRes.status === 'fulfilled' ? headerTemplatesRes.value.data.sort((a, b) => a.displayName.localeCompare(b.displayName)) : [],
      footerTemplates: footerTemplatesRes.status === 'fulfilled' ? footerTemplatesRes.value.data.sort((a, b) => a.displayName.localeCompare(b.displayName)) : [],
      articlePresets: articlePresetsRes.status === 'fulfilled' ? 
        articlePresetsRes.value.data.sort((a, b) => {
          // 先按 sortOrder 排序，再按名稱排序
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.name.localeCompare(b.name);
        }) : [],
      defaultContentSettings: defaultContentRes.status === 'fulfilled' ? defaultContentRes.value.data : null,
    };
  },
}; 