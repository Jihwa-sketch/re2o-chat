import { HTMLAttributes } from "react";
import { Category } from "@/lib/types";

const categoryClasses: Record<Category, string> = {
  "제품 관련": "bg-brand-soft text-brand-strong",
  "실제 임상": "bg-[#F0EBFF] text-[#6938D3]",
  "비급여 승인": "bg-warning-soft text-[#B4690E]",
  "부작용": "bg-danger-soft text-danger",
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
