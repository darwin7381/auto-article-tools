'use client';

import { HeroUIProvider } from "@heroui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ReactNode } from "react";
import { ProcessingProvider } from "@/context/ProcessingContext";
import { ThemeProvider } from "next-themes";

// 直接使用 HeroUIProvider，不再需要嵌套的主題感知包裝器
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
