# Clerk Google 登录配置指南

## 完成的配置

我们已经为项目配置了 Clerk 的 Google 登录功能，使用了官方推荐的主题设置方法：

1. 环境变量设置 (`.env.local`)
   - 添加了 Clerk 的 API 密钥，保留了所有现有配置

2. 身份验证中间件 (`middleware.ts`)
   - 配置了路由保护
   - 设置了公开路由和需要认证的路由

3. 全局 Clerk 提供程序 (`src/app/providers.tsx`)
   - 使用了官方的深色主题：`baseTheme: dark`
   - 从 `@clerk/themes` 导入深色主题

4. 简洁的登录与注册页面
   - 简化了页面代码，使用官方主题
   - 移除了自定义样式，避免冲突

5. 用户导航组件 (`src/components/UserNav.tsx`)
   - 添加了登录/注册按钮
   - 使用了项目的主色调

6. 示例受保护页面 (`src/app/protected/page.tsx`)
   - 用于测试登录功能

## 官方深色主题设置

现在我们使用了 Clerk 官方推荐的深色主题设置方法，而不是自定义样式：

```tsx
// 1. 安装官方主题包
// npm install @clerk/themes

// 2. 在 providers.tsx 中导入并使用
import { dark } from "@clerk/themes";

// 3. 在 ClerkProvider 中应用主题
<ClerkProvider appearance={{ baseTheme: dark }}>
  {children}
</ClerkProvider>
```

这样可以确保所有 Clerk 组件（包括弹窗）都正确使用深色主题，而不会出现白底黑字的问题。

## Node.js 版本问题解决

如果遇到 Node.js 版本问题，请参考 `vscode-terminal-config.md` 文件，其中提供了多种方法来确保 VS Code 使用正确的 Node.js 版本。

## 测试登录功能

配置完成后，您可以:

1. 运行开发服务器：`npm run dev`
2. 访问主页并点击登录按钮测试 Google 登录
3. 或直接访问：
   - 登录页面：http://localhost:3000/sign-in
   - 注册页面：http://localhost:3000/sign-up
   - 受保护页面：http://localhost:3000/protected (需要登录)
