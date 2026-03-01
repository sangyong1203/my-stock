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
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>Total Market Value</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Wallet className="size-5 text-emerald-500" />
          {formatCurrency(model.summaries.marketValue)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function TotalCostBasisModule({ model }: DashboardModuleProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>Total Cost Basis</CardDescription>
        <CardTitle className="text-2xl">
          {formatCurrency(model.summaries.invested)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export function UnrealizedPnlModule({ model }: DashboardModuleProps) {
  const positive = model.summaries.unrealizedPnl >= 0;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>Unrealized P/L</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl">
          {positive ? (
            <TrendingUp className="size-5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-5 text-rose-500" />
          )}
          <span className={positive ? "text-emerald-500" : "text-rose-500"}>
            {formatCurrency(model.summaries.unrealizedPnl)}
          </span>
        </CardTitle>
        <CardDescription
          className={
            model.summaries.returnRate >= 0 ? "text-emerald-500" : "text-rose-500"
          }
        >
          {model.summaries.returnRate.toFixed(2)}%
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function RealizedPnlModule({ model }: DashboardModuleProps) {
  const positive = model.dashboard.realizedPnl >= 0;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>Realized P/L</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl">
          {positive ? (
            <TrendingUp className="size-5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-5 text-rose-500" />
          )}
          <span className={positive ? "text-emerald-500" : "text-rose-500"}>
            {formatCurrency(model.dashboard.realizedPnl)}
          </span>
        </CardTitle>
        <CardDescription
          className={
            model.dashboard.realizedReturnRate >= 0
              ? "text-emerald-500"
              : "text-rose-500"
          }
        >
          {model.dashboard.realizedReturnRate.toFixed(2)}%
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
