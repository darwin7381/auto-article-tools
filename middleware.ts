import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// 公开路由列表
const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  // API 路由
  "/api/process-file",
  "/api/process-pdf",
  "/api/parse-url",
  "/api/process-url",
  "/api/upload",
  "/api/images"
];

export function middleware(request: NextRequest) {
  const { nextUrl, url } = request;
  const { userId } = getAuth(request);

  // 检查当前路径是否是公开路由
  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith("*")) {
      // 如果路由以 * 结尾，那么它是一个前缀匹配
      const prefix = route.slice(0, -1);
      return nextUrl.pathname.startsWith(prefix);
    }
    return nextUrl.pathname === route;
  });

  // 如果是公开路由，或者用户已登录，则允许访问
  if (isPublicRoute || userId) {
    return NextResponse.next();
  }

  // 否则重定向到登录页面
  return NextResponse.redirect(new URL("/sign-in", url));
}

export const config = {
  matcher: [
    // 排除静态文件和API路由
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ],
};
