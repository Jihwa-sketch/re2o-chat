"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { CategoryBadge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Category } from "@/lib/types";

interface Escalation {
  id: number;
  conversationId: number;
  repName: string;
  category: Category;
  question: string;
  confidence: number | null;
  status: "pending" | "answered";
  pmAnswer: string | null;
  pmName: string | null;
  createdAt: string;
  answeredAt: string | null;
  hospital: string | null;
  procedureDate: string | null;
  procedureProtocol: string | null;
  photoDataUrl: string | null;
}

const REFRESH_INTERVAL_MS = 15000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function AdverseEventFields({ e }: { e: Escalation }) {
  if (!e.hospital && !e.procedureDate && !e.procedureProtocol && !e.photoDataUrl) return null;
  return (
    <div className="flex flex-col gap-3 rounded-control bg-white/60 p-3 text-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <p className="text-xs text-text-tertiary">병원</p>
          <p className="text-text">{e.hospital || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">시술일</p>
          <p className="text-text">{e.procedureDate || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">시술 프로토콜</p>
          <p className="text-text">{e.procedureProtocol || "-"}</p>
        </div>
      </div>
      {e.photoDataUrl && (
        <div>
          <p className="mb-1 text-xs text-text-tertiary">첨부 사진</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.photoDataUrl}
            alt="부작용 사례 첨부 사진"
            className="max-h-64 rounded-control border border-border object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [pmName, setPmName] = useState("");
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("re2o_pm_name");
    // localStorage is only available after mount; see same note in app/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setPmName(stored);
  }, []);

  const load = async () => {
    const res = await fetch("/api/admin/escalations");
    const data = await res.json();
    setEscalations(data.escalations ?? []);
  };

  useEffect(() => {
    // Initial fetch on mount, then poll for new escalations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handlePmNameChange = (value: string) => {
    setPmName(value);
    localStorage.setItem("re2o_pm_name", value);
  };

  const submitAnswer = async (id: number) => {
    const answer = drafts[id]?.trim();
    if (!answer || !pmName.trim()) {
      alert("담당자 이름과 답변 내용을 입력해주세요.");
      return;
    }
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/admin/escalations/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pmAnswer: answer, pmName: pmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "답변 등록에 실패했습니다.");
        return;
      }
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    } finally {
      setSubmittingId(null);
    }
  };

  const pending = escalations.filter((e) => e.status === "pending");
  const pendingAdverse = pending.filter((e) => e.category === "부작용");
  const pendingOther = pending.filter((e) => e.category !== "부작용");
  const answered = escalations.filter((e) => e.status === "answered").reverse();

  const renderCard = (e: Escalation, emphasize: boolean) => (
    <Card
      key={e.id}
      className={
        emphasize
          ? "flex flex-col gap-3 border-2 border-danger bg-danger-soft"
          : "flex flex-col gap-3"
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {emphasize && <span className="text-sm font-bold text-danger">⚠️ 부작용</span>}
          <CategoryBadge category={e.category} />
          <StatusPill status="pending" />
        </div>
        <span className="text-xs text-text-tertiary">{timeAgo(e.createdAt)}</span>
      </div>
      <div>
        <p className="text-xs text-text-secondary">{e.repName}님의 질문</p>
        <p className="mt-1 text-[15px] text-text">{e.question}</p>
      </div>
      <AdverseEventFields e={e} />
      <Textarea
        placeholder="답변을 입력하세요"
        rows={3}
        value={drafts[e.id] ?? ""}
        onChange={(ev) => setDrafts((prev) => ({ ...prev, [e.id]: ev.target.value }))}
      />
      <Button
        className="self-end"
        onClick={() => submitAnswer(e.id)}
        disabled={submittingId === e.id}
      >
        {submittingId === e.id ? "전송 중..." : "답변 전송"}
      </Button>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">이관 대시보드</h1>
          <p className="mt-1 text-sm text-text-secondary">
            AI가 답변하지 못한 문의를 확인하고 답변해주세요.
          </p>
        </div>
        <div className="w-48">
          <Input
            placeholder="담당자 이름"
            value={pmName}
            onChange={(e) => handlePmNameChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-danger">
          ⚠️ 부작용 이관 ({pendingAdverse.length})
        </h2>
        {pendingAdverse.length === 0 && (
          <p className="py-4 text-center text-sm text-text-tertiary">
            대기중인 부작용 사례가 없어요.
          </p>
        )}
        {pendingAdverse.map((e) => renderCard(e, true))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-text-secondary">
          미해결 문의 ({pendingOther.length})
        </h2>
        {pendingOther.length === 0 && (
          <p className="py-4 text-center text-sm text-text-tertiary">
            대기중인 이관 문의가 없어요.
          </p>
        )}
        {pendingOther.map((e) => renderCard(e, false))}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowAnswered((v) => !v)}
          className="self-start text-sm font-medium text-text-secondary hover:text-text"
        >
          {showAnswered ? "답변 완료 내역 숨기기" : `답변 완료 내역 보기 (${answered.length})`}
        </button>
        {showAnswered &&
          answered.map((e) => (
            <Card key={e.id} className="flex flex-col gap-2 opacity-80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={e.category} />
                  <StatusPill status="answered" />
                </div>
                <span className="text-xs text-text-tertiary">
                  {e.pmName} · {e.answeredAt ? timeAgo(e.answeredAt) : ""}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{e.repName}님의 질문</p>
              <p className="text-[15px] text-text">{e.question}</p>
              <AdverseEventFields e={e} />
              <p className="rounded-control bg-surface-muted p-3 text-[15px] text-text">
                {e.pmAnswer}
              </p>
            </Card>
          ))}
      </div>
    </div>
  );
}
