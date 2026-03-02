"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";

function PnlMetricRow({
  label,
  amount,
  rate,
}: {
  label: string;
  amount: number;
  rate: number;
}) {
  const positive = amount >= 0;

  return (
    <div
      className={`module-pnl-row module-pnl-row-${label.toLowerCase().replace(/\s+|\/+/g, "-")} space-y-1`}
    >
      <CardDescription className="module-pnl-row-label">{label}</CardDescription>
      <div className="module-pnl-row-values flex items-center justify-between gap-3">
        <CardTitle className="module-pnl-row-amount flex items-center gap-2 text-xl">
          {positive ? (
            <TrendingUp className="size-5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-5 text-rose-500" />
          )}
          <span className={positive ? "text-emerald-500" : "text-rose-500"}>
            {formatCurrency(amount)}
          </span>
        </CardTitle>
        <span
          className={`module-pnl-row-rate text-sm font-medium ${
            rate >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {rate.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export function PnlSummaryModule({ model }: DashboardModuleProps) {
  return (
    <Card className="module-card module-pnl-summary h-full max-h-[180px] border-border/70">
      <CardHeader className="module-card-header module-pnl-summary-header flex h-full flex-col justify-between gap-4 pb-2">
        <PnlMetricRow
          label="Unrealized P/L"
          amount={model.summaries.unrealizedPnl}
          rate={model.summaries.returnRate}
        />
        <PnlMetricRow
          label="Realized P/L"
          amount={model.dashboard.realizedPnl}
          rate={model.dashboard.realizedReturnRate}
        />
      </CardHeader>
    </Card>
  );
}
