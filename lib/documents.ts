import { getDb } from "@/lib/db";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf-8");
}

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_SIZE) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < paragraph.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(paragraph.slice(i, i + CHUNK_SIZE));
      }
      continue;
    }

    if ((current + "\n\n" + paragraph).length > CHUNK_SIZE) {
      if (current) chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

export async function ingestDocument(filename: string, buffer: Buffer) {
  const text = await extractText(filename, buffer);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("문서에서 텍스트를 추출하지 못했습니다.");
  }

  const db = getDb();
  const tx = await (await db).transaction("write");
  try {
    const docResult = await tx.execute({
      sql: "INSERT INTO documents (filename) VALUES (?)",
      args: [filename],
    });
    const documentId = Number(docResult.lastInsertRowid);

    for (let i = 0; i < chunks.length; i++) {
      await tx.execute({
        sql: "INSERT INTO chunks (document_id, content, chunk_index) VALUES (?, ?, ?)",
        args: [documentId, chunks[i], i],
      });
    }

    await tx.commit();
    return { documentId, chunkCount: chunks.length };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function listDocuments() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT d.id, d.filename, d.uploaded_at as uploadedAt, COUNT(c.id) as chunkCount
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     GROUP BY d.id
     ORDER BY d.uploaded_at DESC`
  );
  return result.rows;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM chunks WHERE document_id = ?", args: [id] },
      { sql: "DELETE FROM documents WHERE id = ?", args: [id] },
    ],
    "write"
  );
}
