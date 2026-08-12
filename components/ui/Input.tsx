import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-control border border-border bg-surface px-4 py-3 text-[15px] text-text placeholder:text-text-tertiary outline-none transition-colors focus:border-brand ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full resize-none rounded-control border border-border bg-surface px-4 py-3 text-[15px] text-text placeholder:text-text-tertiary outline-none transition-colors focus:border-brand ${className}`}
      {...props}
    />
  );
});
