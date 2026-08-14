import { NextResponse } from "next/server";
import { getSummitStats } from "@/lib/summit";

export async function GET() {
  try {
    const stats = await getSummitStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[dashboard] 집계 실패:", err);
    return NextResponse.json(
      { error: "데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }
}
