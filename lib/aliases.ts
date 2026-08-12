import { ALIASES } from "@/config/aliases";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REPLACEMENTS: [RegExp, string][] = Object.entries(ALIASES)
  .flatMap(([canonical, variants]) => variants.map((variant) => [variant, canonical] as const))
  .sort((a, b) => b[0].length - a[0].length)
  .map(([variant, canonical]) => [new RegExp(escapeRegExp(variant), "gi"), canonical]);

/** 등록된 별칭/오타를 정식 명칭으로 치환한다 (검색·분류 전 전처리용). */
export function normalizeAliases(text: string): string {
  let result = text;
  for (const [pattern, canonical] of REPLACEMENTS) {
    result = result.replace(pattern, canonical);
  }
  return result;
}
