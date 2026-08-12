"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { CategoryBadge } from "@/components/ui/Badge";
import { ChatMessage, Category } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

interface PendingAdverseEvent {
  repMessageId: number;
  question: string;
}

function hasPendingEscalation(messages: ChatMessage[]): boolean {
  const escalatedCount = messages.filter((m) => m.status === "escalated").length;
  const pmCount = messages.filter((m) => m.role === "pm").length;
  return escalatedCount > pmCount;
}

export default function Home() {
  const [repName, setRepName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAdverseEvent, setPendingAdverseEvent] = useState<PendingAdverseEvent | null>(
    null
  );
  const [aeHospital, setAeHospital] = useState("");
  const [aeProcedureDate, setAeProcedureDate] = useState("");
  const [aeProtocol, setAeProtocol] = useState("");
  const [aePhotoDataUrl, setAePhotoDataUrl] = useState<string | null>(null);
  const [aePhotoName, setAePhotoName] = useState<string | null>(null);
  const [aeSubmitting, setAeSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("re2o_rep_name");
    const storedConversationId = localStorage.getItem("re2o_conversation_id");
    // localStorage is only available after mount; setting state here (not during
    // render) is required to avoid a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedName) setRepName(storedName);
    if (storedConversationId) setConversationId(Number(storedConversationId));
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) setMessages(data.messages);
      });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !hasPendingEscalation(messages)) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId, messages]);

  const startChat = () => {
    if (!nameInput.trim()) return;
    localStorage.setItem("re2o_rep_name", nameInput.trim());
    setRepName(nameInput.trim());
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput("");
    setSending(true);

    const optimisticMessage: ChatMessage = {
      id: Date.now(),
      conversationId: conversationId ?? 0,
      role: "rep",
      content: question,
      category: null,
      status: null,
      confidence: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repName,
          conversationId: conversationId ?? undefined,
          message: question,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "오류가 발생했습니다.");
        return;
      }
      if (!conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem("re2o_conversation_id", String(data.conversationId));
      }
      const res2 = await fetch(`/api/conversations/${data.conversationId}`);
      const data2 = await res2.json();
      setMessages(data2.messages);

      if (data.status === "needs_adverse_event_details") {
        setPendingAdverseEvent({ repMessageId: data.repMessageId, question });
      }
    } finally {
      setSending(false);
    }
  };

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  const handlePhotoSelect = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      alert("사진 용량은 5MB 이하로 첨부해주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAePhotoDataUrl(reader.result as string);
      setAePhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submitAdverseEventDetails = async () => {
    if (!pendingAdverseEvent || !conversationId) return;
    if (!aeHospital.trim() || !aeProcedureDate.trim() || !aeProtocol.trim()) {
      alert("병원, 시술일, 시술 프로토콜을 모두 입력해주세요.");
      return;
    }
    setAeSubmitting(true);
    try {
      const res = await fetch("/api/chat/adverse-event-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          repMessageId: pendingAdverseEvent.repMessageId,
          hospital: aeHospital.trim(),
          procedureDate: aeProcedureDate.trim(),
          procedureProtocol: aeProtocol.trim(),
          photoDataUrl: aePhotoDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "오류가 발생했습니다.");
        return;
      }
      const res2 = await fetch(`/api/conversations/${conversationId}`);
      const data2 = await res2.json();
      setMessages(data2.messages);
      setPendingAdverseEvent(null);
      setAeHospital("");
      setAeProcedureDate("");
      setAeProtocol("");
      setAePhotoDataUrl(null);
      setAePhotoName(null);
    } finally {
      setAeSubmitting(false);
    }
  };

  if (!repName) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <Card className="flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">Re2O 영업지원 챗봇</h1>
            <p className="mt-1 text-sm text-text-secondary">
              이름을 입력하면 바로 문의를 시작할 수 있어요.
            </p>
          </div>
          <Input
            placeholder="이름을 입력하세요"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startChat()}
            autoFocus
          />
          <Button onClick={startChat} disabled={!nameInput.trim()}>
            시작하기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-text">Re2O 영업지원 챗봇</h1>
            <p className="text-xs text-text-secondary">{repName}님</p>
          </div>
          <Link href="/admin" className="text-xs text-text-tertiary hover:text-text-secondary">
            PM 콘솔
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <p className="mt-12 text-center text-sm text-text-tertiary">
            궁금한 점을 자유롭게 물어보세요.
            <br />
            제품 정보, 시술 프로토콜, 임상 데이터, 부작용 등 무엇이든 좋아요.
          </p>
        )}
        {messages.map((m) => {
          if (m.role === "rep") {
            return (
              <ChatBubble key={m.id} role="rep">
                {m.content}
              </ChatBubble>
            );
          }
          const role = m.role === "pm" ? "pm" : m.status === "escalated" ? "pending" : "ai";
          const isAdverseEvent = m.category === "부작용";
          return (
            <ChatBubble
              key={m.id}
              role={role}
              emphasize={isAdverseEvent}
              footer={
                m.category && role !== "pending" && !isAdverseEvent ? (
                  <CategoryBadge category={m.category as Category} />
                ) : undefined
              }
            >
              {m.content}
            </ChatBubble>
          );
        })}
        {pendingAdverseEvent && (
          <ChatBubble role="pending" emphasize>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[15px] font-bold">
                  리투오 부작용 접수 전에, 확인해야 할 사항이 있어요
                </p>
                <p className="mt-1 text-xs text-danger/80">
                  아래 내용을 빠짐없이 알려주시면 담당 PM이 더 빠르게 확인할 수 있어요.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-danger/90">
                  어느 병원에서 발생했나요?
                </label>
                <Input
                  placeholder="병원명을 입력해주세요"
                  value={aeHospital}
                  onChange={(e) => setAeHospital(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-danger/90">
                  시술은 언제 진행했나요?
                </label>
                <Input
                  placeholder="예: 2026-08-12"
                  value={aeProcedureDate}
                  onChange={(e) => setAeProcedureDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-danger/90">
                  어떤 프로토콜로 시술했나요?
                </label>
                <Textarea
                  placeholder="사용 제품, 시술 방법 등을 알려주세요"
                  rows={2}
                  value={aeProtocol}
                  onChange={(e) => setAeProtocol(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-danger/90">
                  관련 사진이 있다면 첨부해주세요 (선택)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                  className="text-xs text-danger/80 file:mr-3 file:rounded-control file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-danger"
                />
                {aePhotoName && (
                  <p className="text-xs text-danger/80">첨부됨: {aePhotoName}</p>
                )}
              </div>

              <Button
                onClick={submitAdverseEventDetails}
                disabled={aeSubmitting}
                className="self-end bg-danger! hover:bg-[#c93646]!"
              >
                {aeSubmitting ? "접수 중..." : "부작용 사례 접수하기"}
              </Button>
            </div>
          </ChatBubble>
        )}
        {sending && (
          <ChatBubble role="ai">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" />
            </span>
          </ChatBubble>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              placeholder={
                pendingAdverseEvent
                  ? "위 부작용 사례 정보를 먼저 입력해주세요"
                  : "메시지를 입력하세요"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={sending || !!pendingAdverseEvent}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={sending || !input.trim() || !!pendingAdverseEvent}
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
