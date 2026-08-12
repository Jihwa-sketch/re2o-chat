export const CATEGORIES = [
  "제품 정보",
  "시술 프로토콜",
  "임상 데이터",
  "부작용",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SENSITIVE_CATEGORIES: Category[] = ["임상 데이터", "부작용"];

export type MessageStatus = "answered_ai" | "escalated" | "answered_pm";

export interface AdverseEventDetails {
  hospital: string;
  procedureDate: string;
  procedureProtocol: string;
}

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
