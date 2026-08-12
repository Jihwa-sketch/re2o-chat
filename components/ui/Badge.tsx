import { HTMLAttributes } from "react";
import { Category } from "@/lib/types";

const categoryClasses: Record<Category, string> = {
  "제품 정보": "bg-brand-soft text-brand-strong",
  "시술 프로토콜": "bg-warning-soft text-[#B4690E]",
  "임상 데이터": "bg-[#F0EBFF] text-[#6938D3]",
  부작용: "bg-danger-soft text-danger",
  기타: "bg-surface-muted text-text-secondary",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold ${categoryClasses[category]}`}
    >
      {category}
    </span>
  );
}

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-pill bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-secondary ${className}`}
      {...props}
    />
  );
}
