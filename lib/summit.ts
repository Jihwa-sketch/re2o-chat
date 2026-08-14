const EVENT_DATE = "2026-10-07";
const KST_TIME_ZONE = "Asia/Seoul";

export const ROUTE_CATEGORIES = ["휴메딕스", "엘앤씨바이오", "지인소개"] as const;
export type RouteCategory = (typeof ROUTE_CATEGORIES)[number];

/**
 * 시트에 실제로 들어오는 원본 표기(영문 회사명 등)를 표준 카테고리로 매핑한다.
 * 여기 없는 값이나 콤마로 여러 개를 동시에 선택한 값은 전부 "지인소개"로 묶는다.
 */
const ROUTE_ALIASES: Record<RouteCategory, string[]> = {
  휴메딕스: ["humedix", "휴메딕스"],
  엘앤씨바이오: ["l&c bio", "l&c", "lnc bio", "엘앤씨바이오", "엘앤씨"],
  지인소개: ["지인 소개", "지인소개", "지인"],
};

export function normalizeRouteCategory(raw: string | null | undefined): RouteCategory {
  const value = (raw ?? "").trim();
  if (!value || value.includes(",") || value.includes("/")) return "지인소개";
  const lower = value.toLowerCase();
  for (const category of ROUTE_CATEGORIES) {
    if (ROUTE_ALIASES[category].some((alias) => alias.toLowerCase() === lower)) {
      return category;
    }
  }
  return "지인소개";
}

function splitMultiSelect(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part !== "-");
}

function kstDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST_TIME_ZONE }).format(date);
}

function daysBetweenKstDateKeys(fromKey: string, toKey: string): number {
  const fromMs = Date.parse(`${fromKey}T00:00:00+09:00`);
  const toMs = Date.parse(`${toKey}T00:00:00+09:00`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/** Apps Script doGet이 반환하는 행 하나: [타임스탬프, 신청경로, 지역, 활용도, 관심부위, 기대세션] */
type RawSummitRow = [string, string, string, number | string | null, string, string];

interface ParsedRow {
  timestamp: Date;
  route: RouteCategory;
  region: string;
  usageScore: number | null;
  interestAreas: string[];
  expectedSessions: string[];
}

export interface CountBreakdown {
  label: string;
  count: number;
  pct: number;
}

export interface SummitStats {
  eventDate: string;
  daysUntilEvent: number;
  totalCount: number;
  todayCount: number;
  lastUpdated: string;
  routeBreakdown: (CountBreakdown & { category: RouteCategory })[];
  regionBreakdown: CountBreakdown[];
  usageScore: {
    average: number;
    distribution: CountBreakdown[];
  };
  interestAreas: CountBreakdown[];
  expectedSessions: CountBreakdown[];
}

function pct(count: number, total: number): number {
  return total ? Math.round((count / total) * 1000) / 10 : 0;
}

/** 카운트가 낮은 항목을 "기타"로 묶는다 (전체 대비 5% 미만). */
function bucketSmallShares(counts: Map<string, number>, total: number): CountBreakdown[] {
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const kept: [string, number][] = [];
  let etcCount = 0;
  for (const [label, count] of entries) {
    if (count / total >= 0.05) {
      kept.push([label, count]);
    } else {
      etcCount += count;
    }
  }
  const result = kept.map(([label, count]) => ({ label, count, pct: pct(count, total) }));
  if (etcCount > 0) {
    result.push({ label: "기타", count: etcCount, pct: pct(etcCount, total) });
  }
  return result;
}

function countMultiSelect(rows: ParsedRow[], pick: (row: ParsedRow) => string[]): CountBreakdown[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const value of pick(row)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: pct(count, rows.length) }));
}

async function fetchRawRows(): Promise<RawSummitRow[]> {
  const url = process.env.SUMMIT_SHEET_URL;
  if (!url) {
    throw new Error("SUMMIT_SHEET_URL이 설정되지 않았습니다.");
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`시트 연동 응답 오류: ${res.status}`);
  }
  const data = (await res.json()) as { rows?: RawSummitRow[]; error?: string };
  if (data.error) {
    throw new Error(`시트 연동 오류: ${data.error}`);
  }
  return data.rows ?? [];
}

function parseRow(raw: RawSummitRow): ParsedRow | null {
  const [rawTimestamp, rawRoute, rawRegion, rawUsageScore, rawInterestAreas, rawExpectedSessions] = raw;
  const timestamp = new Date(rawTimestamp);
  if (Number.isNaN(timestamp.getTime())) return null;

  const usageScore =
    typeof rawUsageScore === "number"
      ? rawUsageScore
      : rawUsageScore
        ? Number(rawUsageScore)
        : null;

  return {
    timestamp,
    route: normalizeRouteCategory(rawRoute),
    region: (rawRegion ?? "").trim() || "미기재",
    usageScore: usageScore && !Number.isNaN(usageScore) ? usageScore : null,
    interestAreas: splitMultiSelect(rawInterestAreas),
    expectedSessions: splitMultiSelect(rawExpectedSessions),
  };
}

export async function getSummitStats(): Promise<SummitStats> {
  const rawRows = await fetchRawRows();
  const rows = rawRows.map(parseRow).filter((row): row is ParsedRow => row !== null);
  const total = rows.length;

  const now = new Date();
  const todayKey = kstDateKey(now);
  const todayCount = rows.filter((row) => kstDateKey(row.timestamp) === todayKey).length;

  const routeCounts = new Map<RouteCategory, number>(ROUTE_CATEGORIES.map((c) => [c, 0]));
  for (const row of rows) {
    routeCounts.set(row.route, (routeCounts.get(row.route) ?? 0) + 1);
  }
  const routeBreakdown = ROUTE_CATEGORIES.map((category) => {
    const count = routeCounts.get(category) ?? 0;
    return { category, label: category, count, pct: pct(count, total) };
  });

  const regionCounts = new Map<string, number>();
  for (const row of rows) {
    regionCounts.set(row.region, (regionCounts.get(row.region) ?? 0) + 1);
  }
  const regionBreakdown = bucketSmallShares(regionCounts, total);

  const scored = rows.filter((row): row is ParsedRow & { usageScore: number } => row.usageScore !== null);
  const average = scored.length
    ? Math.round((scored.reduce((sum, row) => sum + row.usageScore, 0) / scored.length) * 10) / 10
    : 0;
  const distribution = [1, 2, 3, 4, 5].map((score) => {
    const count = scored.filter((row) => row.usageScore === score).length;
    return { label: String(score), count, pct: pct(count, scored.length) };
  });

  return {
    eventDate: EVENT_DATE,
    daysUntilEvent: daysBetweenKstDateKeys(todayKey, EVENT_DATE),
    totalCount: total,
    todayCount,
    lastUpdated: now.toISOString(),
    routeBreakdown,
    regionBreakdown,
    usageScore: { average, distribution },
    interestAreas: countMultiSelect(rows, (row) => row.interestAreas),
    expectedSessions: countMultiSelect(rows, (row) => row.expectedSessions),
  };
}
