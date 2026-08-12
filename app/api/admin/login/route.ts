import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "re2o_admin_auth";

export async function POST(request: NextRequest) {
  const { passcode } = (await request.json()) as { passcode?: string };
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) {
    return NextResponse.json({ ok: true });
  }

  if (passcode !== expected) {
    return NextResponse.json({ error: "패스코드가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
