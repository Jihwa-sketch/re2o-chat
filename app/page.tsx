"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { CategoryBadge } from "@/components/ui/Badge";
import { ChatMessage, Category } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

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
    } finally {
      setSending(false);
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
            제품, 임상, 비급여 승인, 부작용 등 무엇이든 좋아요.
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
          return (
            <ChatBubble
              key={m.id}
              role={role}
              footer={
                m.category && role !== "pending" ? (
                  <CategoryBadge category={m.category as Category} />
                ) : undefined
              }
            >
              {m.content}
            </ChatBubble>
          );
        })}
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
              placeholder="메시지를 입력하세요"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={sending}
            />
          </div>
          <Button onClick={sendMessage} disabled={sending || !input.trim()}>
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
