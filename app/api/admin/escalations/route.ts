import { NextRequest, NextResponse } from "next/server";
import { listEscalations } from "@/lib/conversations";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const escalations = await listEscalations(
    status === "pending" || status === "answered" ? status : undefined
  );
  return NextResponse.json({ escalations });
}
