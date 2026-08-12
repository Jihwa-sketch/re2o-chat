import { Category, SENSITIVE_CATEGORIES } from "@/lib/types";
import { SearchResult, findFuzzyMatch, tokenize } from "@/lib/search";
import { normalizeAliases } from "@/lib/aliases";

// 더 구체적인 카테고리를 먼저 검사한다. "제품 관련"은 "제품"처럼 범용적인
// 단어를 포함해 다른 카테고리 질문에도 흔히 등장하므로 마지막에 검사한다.
const CATEGORY_KEYWORDS_PRIORITY: [Category, string[]][] = [
  ["부작용", ["부작용", "이상반응", "이상 반응", "유해사례"]],
  ["실제 임상", ["임상", "임상시험", "임상데이터", "리얼월드", "연구결과", "논문"]],
  ["비급여 승인", ["비급여", "급여", "승인", "심사", "보험", "청구"]],
  ["제품 관련", ["제품", "스펙", "사양", "가격", "견적", "용법", "사용법", "성분", "재고", "납기"]],
];

function classifyCategory(question: string): Category {
  const lower = normalizeAliases(question).toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS_PRIORITY) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return category;
  }
  return "기타";
}

function coverage(question: string, content: string): number {
  const qTokens = Array.from(new Set(tokenize(normalizeAliases(question))));
  if (qTokens.length === 0) return 0;
  const contentTokens = tokenize(normalizeAliases(content));
  const matched = qTokens.filter((t) => findFuzzyMatch(t, contentTokens));
  return matched.length / qTokens.length;
}

export interface KeywordAnswerResult {
  category: Category;
  canAnswer: boolean;
  answer: string | null;
  confidence: number;
  citedChunkIds: number[];
}

const AUTO_ANSWER_THRESHOLD = 0.5;
const SENSITIVE_AUTO_ANSWER_THRESHOLD = 0.8;

/**
 * Anthropic API 키 없이 동작하는 대체 로직. LLM 없이 업로드된 문서에서
 * 질문 단어가 충분히 겹치는 문단을 그대로 발췌해 보여준다(요약/재작성은 하지 않음).
 * 실제 임상/부작용처럼 위험도가 높은 카테고리는 더 엄격한 일치율을 요구한다.
 */
export function keywordClassifyAndAnswer(
  question: string,
  chunks: SearchResult[]
): KeywordAnswerResult {
  const category = classifyCategory(question);

  if (chunks.length === 0) {
    return { category, canAnswer: false, answer: null, confidence: 0, citedChunkIds: [] };
  }

  const top = chunks[0];
  const confidence = coverage(question, top.content);
  const threshold = SENSITIVE_CATEGORIES.includes(category)
    ? SENSITIVE_AUTO_ANSWER_THRESHOLD
    : AUTO_ANSWER_THRESHOLD;

  if (confidence < threshold) {
    return { category, canAnswer: false, answer: null, confidence, citedChunkIds: [] };
  }

  return {
    category,
    canAnswer: true,
    answer: `[${top.filename}] 문서에서 관련 내용을 찾았어요.\n\n${top.content}`,
    confidence,
    citedChunkIds: [top.id],
  };
}
