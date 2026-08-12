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

const ESCALATION_PLACEHOLDER =
  "확인 후 담당 PM에게 전달했어요. 정리되는 대로 답변드릴게요.";

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
    conversationId = createConversation(repName.trim());
  } else if (!getConversationRepName(conversationId)) {
    return NextResponse.json({ error: "존재하지 않는 대화입니다." }, { status: 404 });
  }

  const finalRepName = getConversationRepName(conversationId)!;

  const repMessage = insertMessage({
    conversationId,
    role: "rep",
    content: message.trim(),
  });

  const chunks = searchChunks(message);
  const result = await classifyAndAnswer(message, chunks);

  if (result.canAnswer && result.answer) {
    const aiMessage = insertMessage({
      conversationId,
      role: "ai",
      content: result.answer,
      category: result.category,
      status: "answered_ai",
      confidence: result.confidence,
      sourceChunkIds: result.citedChunkIds,
    });

    appendResolvedRow({
      inquiryId: `ai-${aiMessage.id}`,
      conversationId,
      conversationSeq: getConversationQuestionSeq(conversationId, repMessage.id),
      repName: finalRepName,
      question: message.trim(),
      category: result.category,
      resolutionType: "ai",
      confidence: result.confidence,
      answer: result.answer,
      pmName: null,
      askedAt: repMessage.createdAt,
      resolvedAt: aiMessage.createdAt,
      resolutionTimeSec: secondsBetween(repMessage.createdAt, aiMessage.createdAt),
    }).catch((err) => console.error("[sheets] append 실패:", err));

    return NextResponse.json({
      conversationId,
      status: "answered",
      message: aiMessage,
    });
  }

  const placeholderMessage = insertMessage({
    conversationId,
    role: "ai",
    content: ESCALATION_PLACEHOLDER,
    category: result.category,
    status: "escalated",
    confidence: result.confidence,
  });

  createEscalation({
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
