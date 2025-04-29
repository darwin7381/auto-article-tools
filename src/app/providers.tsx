'use client';

import { HeroUIProvider } from "@heroui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ReactNode } from "react";
import { ProcessingProvider } from "@/context/ProcessingContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <HeroUIProvider>
        <ProcessingProvider>
          {children}
        </ProcessingProvider>
      </HeroUIProvider>
    </ClerkProvider>
  );
}
