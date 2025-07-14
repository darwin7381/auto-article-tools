'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserNav from './UserNav';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ 
  title = "文件處理與WordPress發布系統",
  subtitle = "DOCX/PDF 自動處理並發布到 WordPress"
}: AppHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '首頁', active: pathname === '/' },
    { href: '/admin/ai-config', label: 'AI 配置', active: pathname === '/admin/ai-config' },
    { href: '/config-test', label: '設定測試', active: pathname === '/config-test' },
    { href: '/markdown-test', label: 'Markdown 測試', active: pathname === '/markdown-test' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 shadow border-b border-divider backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex justify-between items-center">
          {/* 左側：Logo 和標題 */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="text-2xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              🏠
            </Link>
            <div>
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {title}
              </h1>
              <p className="text-sm text-foreground/70 hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* 中間：導航 */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  item.active
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-foreground/80 hover:text-foreground hover:bg-background/50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 右側：用戶導航 */}
          <UserNav />
        </div>

        {/* 移動端導航 */}
        <nav className="md:hidden mt-3 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                item.active
                  ? 'bg-primary-500 text-white'
                  : 'text-foreground/80 hover:text-foreground hover:bg-background/50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
} 