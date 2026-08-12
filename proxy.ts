import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "re2o_admin_auth";

export function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
