type Status = "pending" | "answered";

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: { label: "답변 대기중", className: "bg-warning-soft text-[#B4690E]" },
  answered: { label: "답변 완료", className: "bg-[#E9F9F1] text-success" },
};

export function StatusPill({ status }: { status: Status }) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
