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
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`} suppressHydrationWarning>
        <Providers>
          <main className="min-h-screen flex flex-col items-center py-6 md:py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
