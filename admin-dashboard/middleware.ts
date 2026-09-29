import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("attendance_token")?.value;

  const isAuthPage = pathname.startsWith("/login");
  const isDashboardPage =
    pathname === "/" ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/subjects") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  // If trying to access dashboard without cookie/token, let client auth check handle or redirect if cookie exists
  // For Next.js client-side SPA state, client provider also validates localStorage
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
