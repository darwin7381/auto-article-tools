import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "文件處理與WordPress發布系統",
  description: "自動處理 DOCX/PDF 文件並發布到 WordPress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen bg-app-bg dark:bg-dark-app-bg text-foreground flex flex-col items-center py-6 md:py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
