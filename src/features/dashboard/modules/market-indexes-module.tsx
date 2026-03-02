"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardModuleProps } from "@/features/dashboard/types";

function formatIndexValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildSparklinePath(points: number[]) {
  if (points.length === 0) {
    return "";
  }

  const width = 84;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MarketIndexItem({
  label,
  value,
  change,
  changePercent,
  sparkline,
  showDivider,
}: {
  label: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  showDivider?: boolean;
}) {
  const positive = change >= 0;
  const path = buildSparklinePath(sparkline);

  return (
    <div
      className={cn(
        "module-market-index-item flex flex-1 items-stretch gap-4",
        showDivider && "border-l border-border/60 pl-6",
      )}
    >
      <div className="module-market-index-sparkline-tile flex h-full min-h-[72px] w-28 shrink-0 items-center justify-center rounded-[1.35rem] bg-zinc-900/70 shadow-inner ring-1 ring-white/5">
        <svg
          viewBox="0 0 84 28"
          className="module-market-index-sparkline h-full w-[84px]"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={path}
            fill="none"
            stroke={positive ? "rgb(16 185 129)" : "rgb(59 130 246)"}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="module-market-index-copy min-w-0 space-y-1.5">
        <CardDescription className="module-market-index-label text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300/90">
          {label}
        </CardDescription>
        <div className="module-market-index-values flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <CardTitle className="module-market-index-value text-[2rem] leading-none tracking-tight text-white">
            {formatIndexValue(value)}
          </CardTitle>
          <span
            className={cn(
              "module-market-index-change text-sm font-semibold",
              positive ? "text-rose-400" : "text-blue-500",
            )}
          >
            {change >= 0 ? "+" : ""}
            {formatIndexValue(change)} ({changePercent >= 0 ? "+" : ""}
            {Math.abs(changePercent).toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export function MarketIndexesModule({ model }: DashboardModuleProps) {
  const [nasdaq, sp500] = model.dashboard.marketIndexes;

  return (
    <Card className="module-card module-market-indexes h-full max-h-[180px] border-border/70">
      <CardHeader className="module-card-header module-market-indexes-header flex h-full flex-row items-center gap-0 pb-2">
        <MarketIndexItem
          label={nasdaq?.label ?? "NASDAQ"}
          value={nasdaq?.value ?? 0}
          change={nasdaq?.change ?? 0}
          changePercent={nasdaq?.changePercent ?? 0}
          sparkline={nasdaq?.sparkline ?? []}
        />
        <MarketIndexItem
          label={sp500?.label ?? "S&P 500"}
          value={sp500?.value ?? 0}
          change={sp500?.change ?? 0}
          changePercent={sp500?.changePercent ?? 0}
          sparkline={sp500?.sparkline ?? []}
          showDivider
        />
      </CardHeader>
    </Card>
  );
}
