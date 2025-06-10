// Strapi 5 服務 - 使用原生 fetch API

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
    
    return await response.json();
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

// 文稿模板相關 API
export const templatesApi = {
  // 獲取所有模板
  async getAll() {
    return strapiApi<ArticleTemplate[]>('/article-templates?populate=*');
  },

  // 根據類型獲取模板
  async getByType(type: string) {
    return strapiApi<ArticleTemplate[]>(`/article-templates?filters[type][$eq]=${type}&populate=*`);
  },

  // 創建模板
  async create(data: Partial<ArticleTemplate>) {
    return strapiApi<ArticleTemplate>('/article-templates', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  // 更新模板
  async update(id: string, data: Partial<ArticleTemplate>) {
    return strapiApi<ArticleTemplate>(`/article-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  },
};

// WordPress 設定相關 API
export const wordpressSettingsApi = {
  // 獲取設定
  async get() {
    return strapiApi<WordPressSettings>('/wordpress-setting');
  },

  // 更新設定
  async update(data: Partial<WordPressSettings>) {
    return strapiApi<WordPressSettings>('/wordpress-setting', {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  },
};

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

export interface ArticleTemplate {
  id: number;
  documentId: string;
  name: string;
  type: 'sponsored' | 'news' | 'review';
  footerHtml: string;
  footerAdvertising?: string;
  headerNote?: string;
  defaultAuthor?: Author;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface WordPressSettings {
  id: number;
  documentId: string;
  siteName: string;
  siteUrl: string;
  defaultCategory: string;
  defaultTags: string;
  defaultStatus: 'draft' | 'pending' | 'publish' | 'private';
  autoPublish: boolean;
  featuredImageRequired: boolean;
  customFooterHtml: string;
  metaDescription: string;
  seoSettings: Record<string, unknown>; // JSON 物件
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
} 