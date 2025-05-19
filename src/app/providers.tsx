'use client';

import { HeroUIProvider } from "@heroui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ReactNode } from "react";
import { ProcessingProviders } from "@/context/ProcessingProviders";
import { ThemeProvider } from "next-themes";

// 使用 HeroUIProvider 提供全局配置
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <HeroUIProvider>
          <ProcessingProviders>
            {children}
          </ProcessingProviders>
        </HeroUIProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
