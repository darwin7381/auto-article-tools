# Clerk Google 登录生产环境部署指南

## 生产环境配置

当您准备将应用部署到生产环境（如 Vercel）时，需要进行以下配置以确保 Clerk 的 Google 登录功能正常运行：

### 1. 环境变量配置

在 Vercel 项目设置（或其他托管平台）中添加以下环境变量：

```
# Clerk API 密钥（与开发环境相同）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YWxsb3dlZC1nb3NoYXdrLTQyLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_2vX3MjErjaRXcmoDqTxZCO5fTV05eMtsoZY3YrOpnF

# 登录路由配置
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

# 生产环境域名设置（替换为您的实际域名）
NEXT_PUBLIC_CLERK_DOMAIN=your-production-domain.vercel.app
CLERK_TRUST_HOST=true

# 允许的重定向 URLs
CLERK_REDIRECT_URLS=https://your-production-domain.vercel.app
```

> **注意**：请将 `your-production-domain.vercel.app` 替换为您的实际生产环境域名。

### 2. Clerk 仪表板配置

在 Clerk 仪表板中进行以下配置：

1. **添加生产域名**
   - 导航到 "Domains" 设置
   - 添加您的生产环境域名
   - 确认状态为"活跃"

2. **配置 Google OAuth**
   - 确保 Google OAuth 提供商已启用
   - 验证回调 URL 包含：`https://accounts.your-clerk-instance.clerk.accounts.dev/v1/oauth/callback/google`

3. **限制仅公司账号访问**
   - 导航到 "User & Authentication" > "Social Connections"
   - 点击 Google 提供商的设置
   - 开启 "Allowlist domains" 功能
   - 添加您公司的域名（例如 `yourcompany.com`）
   - 此设置将限制只有该域名的 Google 邮箱才能登录

### 3. 部署验证清单

部署完成后，请验证以下项目：

- [ ] 访问首页或任何受保护路由，是否自动重定向到登录页面
- [ ] 使用 Google 账号登录是否成功
- [ ] 登录后是否能正常访问所有页面
- [ ] 使用非公司域名的 Google 账号是否被正确阻止（如果设置了域名限制）
- [ ] 登出功能是否正常工作，登出后是否重定向到登录页面

## 故障排查

如果在生产环境中遇到问题：

1. **CORS 错误**
   - 确认 Clerk 仪表板中已添加您的生产域名
   - 检查环境变量 `NEXT_PUBLIC_CLERK_DOMAIN` 和 `CLERK_REDIRECT_URLS` 是否正确设置

2. **重定向循环**
   - 检查中间件配置是否正确，确保登录页面 `/sign-in` 设置为公开路由

3. **Google 登录失败**
   - 检查 Google OAuth 凭据是否有效
   - 确认回调 URL 设置正确
   - 查看浏览器控制台是否有错误消息

4. **域名限制问题**
   - 确认 Clerk 仪表板中 "Allowlist domains" 设置是否正确
   - 确认测试账号的域名是否在允许列表中

如需进一步帮助，请参考 [Clerk 官方文档](https://clerk.com/docs) 或联系技术支持。
