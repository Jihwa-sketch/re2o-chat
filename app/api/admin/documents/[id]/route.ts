import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/documents";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId)) {
    return NextResponse.json({ error: "잘못된 문서 ID입니다." }, { status: 400 });
  }
  await deleteDocument(documentId);
  return NextResponse.json({ ok: true });
}
