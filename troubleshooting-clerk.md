# Clerk Google 登录配置指南（内部应用版本）

## 完成的配置

我们已经为项目配置了 Clerk 的 Google 登录功能，针对内部应用的特性进行了优化：

1. 环境变量设置 (`.env.local`)
   - 添加了 Clerk 的 API 密钥，保留了所有现有配置
   - 添加了部署域名和重定向URL设置，便于生产环境部署

2. 身份验证中间件 (`middleware.ts`)
   - 将所有路由设置为受保护，需要登录才能访问
   - 只有登录页面 `/sign-in` 是公开的
   - 自动重定向未登录用户到登录页面

3. 全局 Clerk 提供程序 (`src/app/providers.tsx`)
   - 使用官方的深色主题：`baseTheme: dark`

4. 简化的用户界面
   - 移除了注册按钮，保留仅 Google 登录
   - 用户导航组件仅显示已登录用户的头像和下拉菜单

5. 示例受保护页面 (`src/app/protected/page.tsx`)

## 官方深色主题设置

使用 Clerk 官方推荐的深色主题设置方法：

```tsx
// 1. 安装官方主题包
npm install @clerk/themes

// 2. 在 providers.tsx 中导入并使用
import { dark } from "@clerk/themes";

// 3. 在 ClerkProvider 中应用主题
<ClerkProvider appearance={{ baseTheme: dark }}>
  {children}
</ClerkProvider>
```

## 部署到生产环境的配置

当部署到 Vercel 或其他生产环境时，需要更新以下环境变量：

1. 在 Vercel 项目设置或 `.env.production` 中更新：

```
# 生产环境域名设置
NEXT_PUBLIC_CLERK_DOMAIN=your-production-domain.vercel.app
CLERK_TRUST_HOST=true

# 允许的重定向URLs
CLERK_REDIRECT_URLS=https://your-production-domain.vercel.app
```

2. 在 Clerk 仪表板中：
   - 添加您的生产域名到允许的域名列表
   - 确保您的 Google OAuth 设置中包含正确的重定向 URI：
     `https://accounts.your-clerk-instance.clerk.accounts.dev/v1/oauth/callback/google`

## 限制仅公司 Google 账号登录

要限制只允许特定域名的 Google 账号登录：

1. 在 Clerk 仪表板中导航到 "User & Authentication" > "Social Connections"
2. 点击 Google 提供商的设置
3. 开启 "Allowlist domains" 功能
4. 添加您公司的域名（例如 `yourcompany.com`）

## 测试登录功能

配置完成后，可以通过以下步骤测试：

1. 运行开发服务器：`npm run dev`
2. 访问任何页面都会重定向到登录页面
3. 使用 Google 账号登录后，将自动重定向回原始请求的页面
4. 登出后将重定向到登录页面

## 生产环境问题排查

如果部署后遇到登录问题：

1. 检查环境变量是否正确设置
2. 确认 Clerk 仪表板中的域名和回调 URL 设置
3. 检查浏览器控制台是否有 CORS 或其他错误
4. 确认 Google OAuth 凭据配置正确且未过期
