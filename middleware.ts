import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// 唯一公开路由是登录页面
const publicRoutes = [
  "/sign-in",
  "/api/clerk-webhook" // 给 Clerk webhook 的路由，如果需要
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
    return nextUrl.pathname === route || 
           nextUrl.pathname.startsWith(route + "/");
  });

  // 如果是静态资源，允许访问
  if (
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.endsWith(".svg") ||
    nextUrl.pathname.endsWith(".png") ||
    nextUrl.pathname.endsWith(".jpg") ||
    nextUrl.pathname.endsWith(".jpeg") ||
    nextUrl.pathname.endsWith(".ico") ||
    nextUrl.pathname.endsWith(".webp") ||
    nextUrl.pathname.endsWith(".gif")
  ) {
    return NextResponse.next();
  }

  // 如果是公开路由，或者用户已登录，则允许访问
  if (isPublicRoute || userId) {
    return NextResponse.next();
  }

  // 否则重定向到登录页面
  return NextResponse.redirect(new URL("/sign-in", url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/"
  ],
};
