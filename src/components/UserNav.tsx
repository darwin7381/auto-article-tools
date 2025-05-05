'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "./ui/ThemeToggle";

export default function UserNav() {
  const { isSignedIn } = useUser();

  return (
    <div className="flex items-center space-x-4">
      <ThemeToggle />
      
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <>
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm dark:bg-primary-500 dark:hover:bg-primary-600">
              登入
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-white bg-secondary-600 hover:bg-secondary-700 rounded-md shadow-sm dark:bg-secondary-500 dark:hover:bg-secondary-600">
              註冊
            </button>
          </SignUpButton>
        </>
      )}
    </div>
  );
}
