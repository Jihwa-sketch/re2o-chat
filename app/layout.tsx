import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Re2O 영업지원 챗봇",
  description: "영업사원 문의를 자료 기반으로 자동 응답하고, 필요 시 PM에게 이관합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-text">
        {children}
      </body>
    </html>
  );
}
