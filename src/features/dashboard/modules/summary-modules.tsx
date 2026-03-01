"use client";

import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";

export function TotalMarketValueModule({ model }: DashboardModuleProps) {
  return (
    <Card className="h-full border-border/70">
      <CardHeader className="flex h-full flex-col justify-between pb-2">
        <CardDescription>Total Market Value</CardDescription>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wallet className="size-5 text-emerald-500" />
          {formatCurrency(model.summaries.marketValue)}
        </CardTitle>
        <CardDescription>Total Cost Basis</CardDescription>
        <CardTitle className="text-xl">
          {formatCurrency(model.summaries.invested)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

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
    <div className="space-y-1">
      <CardDescription>{label}</CardDescription>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-xl">
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
          className={`text-sm font-medium ${
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
    <Card className="h-full border-border/70">
      <CardHeader className="flex h-full flex-col justify-between gap-4 pb-2">
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
