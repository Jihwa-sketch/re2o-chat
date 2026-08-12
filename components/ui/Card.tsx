import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)] ${className}`}
      {...props}
    />
  );
}
