'use client';

import { HeroUIProvider } from "@heroui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ReactNode } from "react";
import { ProcessingProvider } from "@/context/ProcessingContext";
import { ThemeProvider } from "next-themes";

// 使用 HeroUIProvider 提供全局配置
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <HeroUIProvider>
          <ProcessingProvider>
            {children}
          </ProcessingProvider>
        </HeroUIProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
