'use client';

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn 
        appearance={{
          elements: {
            // 隐藏不需要的选项
            formFieldRow: {
              display: "none"
            },
            footerAction: {
              display: "none"
            }
          }
        }}
      />
    </div>
  );
}
