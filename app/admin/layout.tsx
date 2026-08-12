import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-text">Re2O PM 콘솔</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="rounded-control px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text"
            >
              이관 대시보드
            </Link>
            <Link
              href="/admin/documents"
              className="rounded-control px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text"
            >
              자료 관리
            </Link>
            <Link
              href="/"
              className="rounded-control px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text"
            >
              챗봇으로
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
