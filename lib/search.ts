import { getDb } from "@/lib/db";
import { normalizeAliases } from "@/lib/aliases";

export interface SearchResult {
  id: number;
  documentId: number;
  content: string;
  filename: string;
  score: number;
}

const STOPWORDS = new Set([
  "그리고",
  "그런데",
  "그래서",
  "하지만",
  "그러면",
  "있나요",
  "합니다",
  "인가요",
  "무엇인가요",
  "what",
  "is",
  "are",
  "the",
  "a",
  "an",
  "for",
  "and",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** 짧은 단어는 오타 허용 폭을 좁혀 엉뚱한 단어끼리 매칭되는 걸 막는다. */
function maxEditDistance(len: number): number {
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  return 2;
}

/** 두 토큰이 동일하거나, 길이 대비 허용 오차 안에서 오타로 볼 수 있으면 true. */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  const allowed = Math.min(maxEditDistance(a.length), maxEditDistance(b.length));
  if (allowed === 0) return false;
  return levenshtein(a, b) <= allowed;
}

/** 질문 토큰이 문서 토큰 목록 안에 (오타 허용 포함) 존재하는지 확인 */
export function findFuzzyMatch(token: string, contentTokens: string[]): boolean {
  return contentTokens.some((ct) => tokensMatch(token, ct));
}

export function searchChunks(question: string, limit = 5): SearchResult[] {
  const normalizedQuestion = normalizeAliases(question);
  const tokens = Array.from(new Set(tokenize(normalizedQuestion)));
  if (tokens.length === 0) return [];

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.id as id, c.document_id as documentId, c.content as content, d.filename as filename
       FROM chunks c
       JOIN documents d ON d.id = c.document_id`
    )
    .all() as Omit<SearchResult, "score">[];

  const scored: SearchResult[] = [];
  for (const row of rows) {
    const contentTokens = tokenize(normalizeAliases(row.content));
    let score = 0;
    for (const token of tokens) {
      if (findFuzzyMatch(token, contentTokens)) {
        score += token.length;
      }
    }
    if (score > 0) scored.push({ ...row, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
