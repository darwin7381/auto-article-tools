'use client';

import { ProcessingProvider } from '@/context/ProcessingContext';
import IntegratedFileProcessor from '@/components/file-processing/IntegratedFileProcessor';
import AppHeader from '@/components/AppHeader';

export default function IntegratedProcessingDemo() {
  return (
    <>
      <AppHeader />

      <div className="container mx-auto px-4 pt-32 pb-8 max-w-5xl">
        <div className="space-y-8">
          <div className="bg-background shadow rounded-xl p-6 border border-divider">
            <ProcessingProvider>
              <IntegratedFileProcessor />
            </ProcessingProvider>
          </div>
        </div>

        <footer className="mt-20 py-8 px-6 text-center text-foreground/60 bg-background/50 rounded-xl border border-divider">
          <p>文件處理與WordPress發布系統 © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
} 