import { ReactNode } from "react";

type Role = "rep" | "ai" | "pm" | "pending";

const roleConfig: Record<
  Role,
  { align: string; bubble: string; label?: string }
> = {
  rep: {
    align: "items-end",
    bubble: "bg-brand text-white rounded-br-md",
  },
  ai: {
    align: "items-start",
    bubble: "bg-surface text-text border border-border rounded-bl-md",
    label: "AI 어시스턴트",
  },
  pm: {
    align: "items-start",
    bubble: "bg-[#F0EBFF] text-[#4C1D95] rounded-bl-md",
    label: "PM",
  },
  pending: {
    align: "items-start",
    bubble: "bg-surface-muted text-text-secondary border border-dashed border-border rounded-bl-md",
  },
};

export function ChatBubble({
  role,
  children,
  footer,
}: {
  role: Role;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { align, bubble, label } = roleConfig[role];
  return (
    <div className={`flex flex-col ${align} gap-1`}>
      {label && (
        <span className="px-1 text-xs font-medium text-text-tertiary">{label}</span>
      )}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${bubble}`}
      >
        {children}
      </div>
      {footer && <div className="px-1">{footer}</div>}
    </div>
  );
}
