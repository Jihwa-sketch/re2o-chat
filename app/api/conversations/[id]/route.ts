import { NextRequest, NextResponse } from "next/server";
import { getConversationMessages, getConversationRepName } from "@/lib/conversations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId)) {
    return NextResponse.json({ error: "잘못된 대화 ID입니다." }, { status: 400 });
  }

  const repName = await getConversationRepName(conversationId);
  if (!repName) {
    return NextResponse.json({ error: "존재하지 않는 대화입니다." }, { status: 404 });
  }

  const messages = await getConversationMessages(conversationId);
  return NextResponse.json({ repName, messages });
}
