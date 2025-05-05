import { FileUploadSection } from "../components/ui/sections/FileUploadSection";
import { ProgressSection } from "../components/ui/sections/ProgressSection";
import PreviewSection from "../components/PreviewSection";
import WordPressSection from "../components/WordPressSection";
import FeaturesSection from "../components/FeaturesSection";
import UserNav from "../components/UserNav";

export default function HomePage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 p-4 shadow-medium border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto max-w-5xl">
          <div className="flex justify-between items-center">
          <div>
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">文件處理與WordPress發布系統</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
              DOCX/PDF 自動處理並發布到 WordPress
            </p>
          </div>
          <UserNav />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-28 pb-8 max-w-5xl">
      <div className="space-y-8">
        <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-6 border border-gray-100 dark:border-gray-800">
          <FileUploadSection />
        </div>
        
        <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-6 border border-gray-100 dark:border-gray-800">
          <ProgressSection />
        </div>
        
        <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-6 border border-gray-100 dark:border-gray-800">
          <PreviewSection />
        </div>
        
        <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-6 border border-gray-100 dark:border-gray-800">
          <WordPressSection />
        </div>
        
        <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-6 border border-gray-100 dark:border-gray-800">
          <FeaturesSection />
        </div>
      </div>

      <footer className="mt-20 py-8 px-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
        <p>文件處理與WordPress發布系統 © {new Date().getFullYear()}</p>
      </footer>
    </div>
    </>
  );
}
