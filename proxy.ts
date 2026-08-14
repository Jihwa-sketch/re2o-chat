import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "re2o_admin_auth";
const DASHBOARD_ALLOWED_PREFIXES = ["/dashboard", "/api/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vercel에 별도 프로젝트(같은 저장소)로 대시보드만 배포할 때 DEPLOYMENT_TARGET=dashboard로
  // 설정하면, 챗봇/관리자 콘솔 경로는 전부 막고 /dashboard만 노출한다.
  if (process.env.DEPLOYMENT_TARGET === "dashboard") {
    const isDashboardPath = DASHBOARD_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (!isDashboardPath) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const expected = process.env.ADMIN_PASSCODE;
    if (!expected) return NextResponse.next();

    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    if (cookie === expected) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
