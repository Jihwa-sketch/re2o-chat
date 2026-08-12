import { NextRequest, NextResponse } from "next/server";
import { ingestDocument, listDocuments } from "@/lib/documents";

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const allowedExt = ["pdf", "docx", "doc", "txt", "md"];
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!allowedExt.includes(ext)) {
    return NextResponse.json(
      { error: "지원하지 않는 파일 형식입니다. (pdf, docx, doc, txt, md)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { documentId, chunkCount } = await ingestDocument(file.name, buffer);
    return NextResponse.json({ documentId, chunkCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "업로드 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
