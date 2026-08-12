import { NextRequest, NextResponse } from "next/server";
import { classifyAndAnswer } from "@/lib/claude";
import { searchChunks } from "@/lib/search";
import {
  createConversation,
  createEscalation,
  getConversationQuestionSeq,
  getConversationRepName,
  insertMessage,
  secondsBetween,
} from "@/lib/conversations";
import { notifyPmOfEscalation } from "@/lib/mailer";
import { appendResolvedRow } from "@/lib/sheets";
import { ESCALATION_PLACEHOLDER } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { repName, conversationId: incomingConversationId, message } = body as {
    repName?: string;
    conversationId?: number;
    message?: string;
  };

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  let conversationId = incomingConversationId;
  if (!conversationId) {
    if (!repName || !repName.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    conversationId = await createConversation(repName.trim());
  } else if (!(await getConversationRepName(conversationId))) {
    return NextResponse.json({ error: "존재하지 않는 대화입니다." }, { status: 404 });
  }

  const finalRepName = (await getConversationRepName(conversationId))!;

  const repMessage = await insertMessage({
    conversationId,
    role: "rep",
    content: message.trim(),
  });

  const chunks = await searchChunks(message);
  const result = await classifyAndAnswer(message, chunks);

  if (result.canAnswer && result.answer) {
    const answerText = result.answer;
    const aiMessage = await insertMessage({
      conversationId,
      role: "ai",
      content: answerText,
      category: result.category,
      status: "answered_ai",
      confidence: result.confidence,
      sourceChunkIds: result.citedChunkIds,
    });

    (async () => {
      const conversationSeq = await getConversationQuestionSeq(conversationId, repMessage.id);
      await appendResolvedRow({
        inquiryId: `ai-${aiMessage.id}`,
        conversationId,
        conversationSeq,
        repName: finalRepName,
        question: message.trim(),
        category: result.category,
        resolutionType: "ai",
        confidence: result.confidence,
        answer: answerText,
        pmName: null,
        askedAt: repMessage.createdAt,
        resolvedAt: aiMessage.createdAt,
        resolutionTimeSec: secondsBetween(repMessage.createdAt, aiMessage.createdAt),
      });
    })().catch((err) => console.error("[sheets] append 실패:", err));

    return NextResponse.json({
      conversationId,
      status: "answered",
      message: aiMessage,
    });
  }

  // 부작용 사례는 병원/시술일/시술 프로토콜을 추가로 받은 뒤에 이관을 확정한다.
  if (result.category === "부작용") {
    return NextResponse.json({
      conversationId,
      status: "needs_adverse_event_details",
      repMessageId: repMessage.id,
      category: result.category,
    });
  }

  const placeholderMessage = await insertMessage({
    conversationId,
    role: "ai",
    content: ESCALATION_PLACEHOLDER,
    category: result.category,
    status: "escalated",
    confidence: result.confidence,
  });

  await createEscalation({
    conversationId,
    repMessageId: repMessage.id,
    repName: finalRepName,
    category: result.category,
    question: message.trim(),
    confidence: result.confidence,
  });

  notifyPmOfEscalation({
    repName: finalRepName,
    category: result.category,
    question: message.trim(),
    conversationId,
  }).catch((err) => console.error("[mailer] 알림 발송 실패:", err));

  return NextResponse.json({
    conversationId,
    status: "escalated",
    message: placeholderMessage,
  });
}
