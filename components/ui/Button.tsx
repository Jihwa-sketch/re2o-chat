import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong disabled:bg-text-tertiary",
  secondary:
    "bg-surface-muted text-text hover:bg-border disabled:text-text-tertiary",
  ghost:
    "bg-transparent text-brand hover:bg-brand-soft disabled:text-text-tertiary",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-5 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
