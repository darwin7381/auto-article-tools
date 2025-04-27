'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex justify-center items-center min-h-screen">載入中...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="bg-white dark:bg-zinc-900 shadow-medium rounded-xl p-8 border border-gray-100 dark:border-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-primary-600 dark:text-primary-400">受保護頁面</h1>
        
        <div className="mb-8 p-6 bg-gray-50 dark:bg-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">用戶信息</h2>
          <div className="space-y-2">
            <p><span className="font-medium">名稱:</span> {user?.firstName} {user?.lastName}</p>
            <p><span className="font-medium">電子郵件:</span> {user?.primaryEmailAddress?.emailAddress}</p>
            <p><span className="font-medium">用戶 ID:</span> {user?.id}</p>
          </div>
        </div>
        
        <p className="text-lg">
          這是一個受保護的頁面，只有登入後才能訪問。如果您能看到此頁面，說明 Clerk 的 Google 登入已成功配置！
        </p>
      </div>
    </div>
  );
}
