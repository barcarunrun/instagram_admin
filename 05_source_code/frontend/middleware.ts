import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPrefixes = ["/login", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const isPublicPath = publicPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const hasToken = Boolean(request.cookies.get("auth_token")?.value);

  if (!hasToken && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
