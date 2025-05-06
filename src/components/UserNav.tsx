'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "./ui/ThemeToggle";
import { Button } from "@/components/ui/button/Button";

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
            <Button 
              color="primary"
              variant="solid"
              size="sm"
              radius="md"
              className="font-medium"
            >
              登入
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button 
              color="secondary"
              variant="solid"
              size="sm"
              radius="md"
              className="font-medium"
            >
              註冊
            </Button>
          </SignUpButton>
        </>
      )}
    </div>
  );
}
