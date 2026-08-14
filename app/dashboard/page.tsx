"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarListCard,
  HeroStat,
  RouteBreakdownCard,
  UsageScoreCard,
} from "@/components/dashboard/DashboardWidgets";
import { SummitStats } from "@/lib/summit";

const REFRESH_INTERVAL_MS = 30000;

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatEventDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${y}.${m}.${d}`;
}

export default function SummitDashboardPage() {
  const [stats, setStats] = useState<SummitStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "데이터를 불러오지 못했어요.");
        return;
      }
      setStats(data);
      setError(null);
    } catch {
      setError("네트워크 오류로 데이터를 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="dashboard-scope min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-brand uppercase">
              Re2O Masters Summit
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-text sm:text-2xl">
              사전접수 현황
            </h1>
          </div>
          <span className="flex-none rounded-pill bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand-strong">
            행사일 {stats ? formatEventDate(stats.eventDate) : "2026.10.07"}
          </span>
        </header>

        {error && (
          <div className="rounded-card border border-danger bg-danger-soft p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {!stats && !error && (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-sm text-text-tertiary">
            데이터를 불러오는 중이에요...
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <HeroStat
                label="D-Day"
                value={stats.daysUntilEvent > 0 ? `D-${stats.daysUntilEvent}` : "D-DAY"}
                note={
                  stats.daysUntilEvent > 0
                    ? `행사까지 ${stats.daysUntilEvent}일 남음`
                    : "행사 당일이에요"
                }
                emphasis
              />
              <HeroStat
                label="총 접수 인원"
                value={String(stats.totalCount)}
                unit="명"
                note={`오늘 신규 +${stats.todayCount}명`}
              />
            </div>

            <RouteBreakdownCard items={stats.routeBreakdown} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BarListCard title="소속 지역" items={stats.regionBreakdown} />
              <UsageScoreCard
                average={stats.usageScore.average}
                distribution={stats.usageScore.distribution}
              />
              <BarListCard
                title="관심 시술 부위"
                note="(중복 응답)"
                items={stats.interestAreas}
              />
              <BarListCard title="기대 세션" note="(중복 응답)" items={stats.expectedSessions} />
            </div>

            <p className="pb-2 text-center text-[11px] text-text-tertiary">
              {formatUpdatedAt(stats.lastUpdated)} 기준 · 30초마다 자동 갱신
            </p>
          </>
        )}
      </div>
    </div>
  );
}
