import { Card } from "@/components/ui/Card";
import { CountBreakdown, RouteCategory } from "@/lib/summit";

export function HeroStat({
  label,
  value,
  unit,
  note,
  emphasis = false,
  className = "",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={`flex flex-col gap-1 ${emphasis ? "text-white" : ""} ${className}`}
      style={emphasis ? { backgroundColor: "var(--color-brand)", borderColor: "var(--color-brand)" } : undefined}
    >
      <p
        className={`text-xs font-bold tracking-wide uppercase ${
          emphasis ? "text-white/80" : "text-text-tertiary"
        }`}
      >
        {label}
      </p>
      <p className="tabular-nums text-[32px] leading-none font-extrabold">
        {value}
        {unit && <span className="ml-1 text-base font-semibold">{unit}</span>}
      </p>
      {note && (
        <p className={`text-xs ${emphasis ? "text-white/80" : "text-text-secondary"}`}>{note}</p>
      )}
    </Card>
  );
}

const ROUTE_SWATCH: Record<RouteCategory, string> = {
  휴메딕스: "bg-brand",
  엘앤씨바이오: "bg-[#4E5968]",
  지인소개: "bg-[#D1D6DB]",
};

export function RouteBreakdownCard({
  items,
}: {
  items: (CountBreakdown & { category: RouteCategory })[];
}) {
  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs font-bold tracking-wide text-text-tertiary uppercase">
        신청 경로별 인원
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-pill bg-surface-muted">
        {items.map((item) => (
          <span
            key={item.category}
            className={ROUTE_SWATCH[item.category]}
            style={{ width: `${Math.max(item.pct, item.count > 0 ? 1 : 0)}%` }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-6">
        {items.map((item) => (
          <div key={item.category} className="flex flex-1 items-center gap-2">
            <span className={`h-2.5 w-2.5 flex-none rounded-[3px] ${ROUTE_SWATCH[item.category]}`} />
            <span className="flex-1 text-sm text-text">{item.category}</span>
            <span className="tabular-nums text-sm font-bold text-text">{item.count}명</span>
            <span className="w-11 text-right tabular-nums text-xs text-text-tertiary">
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function BarListCard({
  title,
  note,
  items,
  emptyLabel = "데이터가 없어요",
}: {
  title: string;
  note?: string;
  items: CountBreakdown[];
  emptyLabel?: string;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs font-bold tracking-wide text-text-tertiary uppercase">
        {title}
        {note && <span className="ml-1.5 font-normal normal-case text-text-tertiary">{note}</span>}
      </p>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-text-tertiary">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text">{item.label}</span>
                <span className="tabular-nums text-text-tertiary">{item.count}명</span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-pill bg-surface-muted">
                <div
                  className="h-full rounded-pill bg-brand"
                  style={{ width: `${Math.max(item.pct, item.count > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function UsageScoreCard({
  average,
  distribution,
}: {
  average: number;
  distribution: CountBreakdown[];
}) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs font-bold tracking-wide text-text-tertiary uppercase">
        Re2O 활용도 평균
      </p>
      <div className="flex items-end justify-between gap-4">
        <p className="tabular-nums text-[32px] leading-none font-extrabold text-text">
          {average}
          <span className="ml-1 text-base font-semibold text-text-tertiary">/ 5</span>
        </p>
        <div className="flex flex-1 items-end justify-end gap-2">
          {distribution.map((d) => (
            <div key={d.label} className="flex w-6 flex-col items-center gap-1">
              <div
                className={`w-full rounded-[4px] ${
                  Number(d.label) === Math.round(average) ? "bg-brand" : "bg-brand-soft"
                }`}
                style={{ height: `${Math.max((d.count / maxCount) * 36, d.count > 0 ? 4 : 2)}px` }}
              />
              <span className="text-[10px] text-text-tertiary">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
