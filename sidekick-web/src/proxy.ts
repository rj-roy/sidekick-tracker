import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/emails", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const session = request.cookies.get("OG_L")?.value;

  if (pathname === "/unauthorized") {
    if (session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!isProtected) return NextResponse.next();
  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/unauthorized";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/emails/:path*", "/settings/:path*", "/unauthorized"],
};
