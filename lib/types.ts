export const CATEGORIES = [
  "제품 관련",
  "실제 임상",
  "비급여 승인",
  "부작용",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SENSITIVE_CATEGORIES: Category[] = ["실제 임상", "부작용"];

export type MessageStatus = "answered_ai" | "escalated" | "answered_pm";

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: "rep" | "ai" | "pm";
  content: string;
  category: Category | null;
  status: MessageStatus | null;
  confidence: number | null;
  createdAt: string;
  pmAnswer?: string | null;
  pmAnsweredAt?: string | null;
  escalationStatus?: "pending" | "answered" | null;
}
