import { NextRequest, NextResponse } from "next/server";
import {
  answerEscalation,
  getConversationQuestionSeq,
  getEscalationById,
  getMessageById,
  insertMessage,
  secondsBetween,
} from "@/lib/conversations";
import { appendResolvedRow } from "@/lib/sheets";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const escalationId = Number(id);
  if (!Number.isInteger(escalationId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const body = await request.json();
  const { pmAnswer, pmName } = body as { pmAnswer?: string; pmName?: string };

  if (!pmAnswer || !pmAnswer.trim() || !pmName || !pmName.trim()) {
    return NextResponse.json(
      { error: "답변 내용과 담당자 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const escalation = await getEscalationById(escalationId);
  if (!escalation) {
    return NextResponse.json({ error: "존재하지 않는 이관 건입니다." }, { status: 404 });
  }
  if (escalation.status === "answered") {
    return NextResponse.json({ error: "이미 답변이 완료된 건입니다." }, { status: 409 });
  }

  await answerEscalation(escalationId, pmAnswer.trim(), pmName.trim());

  const pmMessage = await insertMessage({
    conversationId: escalation.conversationId,
    role: "pm",
    content: pmAnswer.trim(),
    category: escalation.category,
    status: "answered_pm",
  });

  const repMessage = await getMessageById(escalation.repMessageId);

  (async () => {
    const conversationSeq = await getConversationQuestionSeq(
      escalation.conversationId,
      escalation.repMessageId
    );
    await appendResolvedRow({
      inquiryId: `pm-${escalation.id}`,
      conversationId: escalation.conversationId,
      conversationSeq,
      repName: escalation.repName,
      question: escalation.question,
      category: escalation.category,
      resolutionType: "pm",
      confidence: escalation.confidence,
      answer: pmAnswer.trim(),
      pmName: pmName.trim(),
      askedAt: repMessage ? repMessage.createdAt : escalation.createdAt,
      resolvedAt: pmMessage.createdAt,
      resolutionTimeSec: repMessage
        ? secondsBetween(repMessage.createdAt, pmMessage.createdAt)
        : null,
      hospital: escalation.hospital,
      procedureDate: escalation.procedureDate,
      procedureProtocol: escalation.procedureProtocol,
    });
  })().catch((err) => console.error("[sheets] append 실패:", err));

  return NextResponse.json({ ok: true, pmMessage });
}
