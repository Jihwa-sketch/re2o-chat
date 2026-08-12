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

const EMPHASIZE_BUBBLE =
  "bg-danger-soft text-[#8A1220] border-2 border-danger rounded-bl-md";

export function ChatBubble({
  role,
  children,
  footer,
  emphasize,
}: {
  role: Role;
  children: ReactNode;
  footer?: ReactNode;
  /** 부작용 사례처럼 강하게 주의를 끌어야 하는 메시지에 사용 */
  emphasize?: boolean;
}) {
  const { align, bubble, label } = roleConfig[role];
  return (
    <div className={`flex flex-col ${align} gap-1`}>
      {(label || emphasize) && (
        <span
          className={`px-1 text-xs font-semibold ${
            emphasize ? "text-danger" : "text-text-tertiary font-medium"
          }`}
        >
          {emphasize ? `⚠️ 부작용 사례${label ? ` · ${label}` : ""}` : label}
        </span>
      )}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          emphasize ? EMPHASIZE_BUBBLE : bubble
        }`}
      >
        {children}
      </div>
      {footer && <div className="px-1">{footer}</div>}
    </div>
  );
}
