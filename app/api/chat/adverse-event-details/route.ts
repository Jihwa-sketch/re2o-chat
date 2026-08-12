import { NextRequest, NextResponse } from "next/server";
import {
  createEscalation,
  getConversationRepName,
  getEscalationByRepMessageId,
  getMessageById,
  insertMessage,
} from "@/lib/conversations";
import { notifyPmOfEscalation } from "@/lib/mailer";
import { ESCALATION_PLACEHOLDER } from "@/lib/constants";

const MAX_PHOTO_DATA_URL_LENGTH = 7_000_000; // base64 기준 대략 5MB 원본 이미지

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId, repMessageId, hospital, procedureDate, procedureProtocol, photoDataUrl } =
    body as {
      conversationId?: number;
      repMessageId?: number;
      hospital?: string;
      procedureDate?: string;
      procedureProtocol?: string;
      photoDataUrl?: string;
    };

  if (!conversationId || !repMessageId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!hospital?.trim() || !procedureDate?.trim() || !procedureProtocol?.trim()) {
    return NextResponse.json(
      { error: "병원, 시술일, 시술 프로토콜을 모두 입력해주세요." },
      { status: 400 }
    );
  }
  if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return NextResponse.json(
      { error: "사진 용량이 너무 커요. 5MB 이하로 첨부해주세요." },
      { status: 400 }
    );
  }

  const repName = await getConversationRepName(conversationId);
  if (!repName) {
    return NextResponse.json({ error: "존재하지 않는 대화입니다." }, { status: 404 });
  }

  const repMessage = await getMessageById(repMessageId);
  if (!repMessage || repMessage.conversationId !== conversationId || repMessage.role !== "rep") {
    return NextResponse.json({ error: "존재하지 않는 문의입니다." }, { status: 404 });
  }

  const existing = await getEscalationByRepMessageId(repMessageId);
  if (existing) {
    return NextResponse.json({ error: "이미 접수된 사례입니다." }, { status: 409 });
  }

  const placeholderMessage = await insertMessage({
    conversationId,
    role: "ai",
    content: ESCALATION_PLACEHOLDER,
    category: "부작용",
    status: "escalated",
    confidence: null,
  });

  await createEscalation({
    conversationId,
    repMessageId,
    repName,
    category: "부작용",
    question: repMessage.content,
    confidence: null,
    hospital: hospital.trim(),
    procedureDate: procedureDate.trim(),
    procedureProtocol: procedureProtocol.trim(),
    photoDataUrl: photoDataUrl ?? null,
  });

  notifyPmOfEscalation({
    repName,
    category: "부작용",
    question: repMessage.content,
    conversationId,
  }).catch((err) => console.error("[mailer] 알림 발송 실패:", err));

  return NextResponse.json({
    conversationId,
    status: "escalated",
    message: placeholderMessage,
  });
}
