"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DocumentRow {
  id: number;
  filename: string;
  uploadedAt: string;
  chunkCount: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const res = await fetch("/api/admin/documents");
    const data = await res.json();
    setDocuments(data.documents ?? []);
  };

  useEffect(() => {
    // Initial fetch on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업로드에 실패했습니다.");
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 문서를 삭제하시겠습니까? 관련 청크가 모두 제거되어 더 이상 답변 근거로 사용되지 않습니다.")) return;
    await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    await loadDocuments();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text">자료 관리</h1>
        <p className="mt-1 text-sm text-text-secondary">
          AI가 자동 답변의 근거로 사용할 문서를 업로드하세요. (PDF, DOCX, TXT, MD)
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          className="text-sm text-text-secondary file:mr-4 file:rounded-control file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-strong hover:file:bg-brand-soft/80"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={handleUpload} disabled={uploading} className="self-start">
          {uploading ? "업로드 중..." : "업로드"}
        </Button>
      </Card>

      <div className="flex flex-col gap-3">
        {documents.length === 0 && (
          <p className="py-8 text-center text-sm text-text-tertiary">
            아직 업로드된 문서가 없습니다.
          </p>
        )}
        {documents.map((doc) => (
          <Card key={doc.id} className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-text">{doc.filename}</span>
              <div className="flex items-center gap-2">
                <Badge>{doc.chunkCount}개 청크</Badge>
                <span className="text-xs text-text-tertiary">
                  {new Date(doc.uploadedAt).toLocaleString("ko-KR")}
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={() => handleDelete(doc.id)}>
              삭제
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
