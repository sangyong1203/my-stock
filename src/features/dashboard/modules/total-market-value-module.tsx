"use client";

import { Wallet } from "lucide-react";
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
    <Card className="module-card module-total-market-value h-full max-h-[180px] border-border/70">
      <CardHeader className="module-card-header module-total-market-value-header flex h-full flex-col justify-between pb-2">
        <CardDescription className="module-total-market-value-label">
          Total Market Value
        </CardDescription>
        <CardTitle className="module-total-market-value-value flex items-center gap-2 text-xl">
          <Wallet className="size-5 text-emerald-500" />
          {formatCurrency(model.summaries.marketValue)}
        </CardTitle>
        <CardDescription className="module-total-cost-basis-label">
          Total Cost Basis
        </CardDescription>
        <CardTitle className="module-total-cost-basis-value text-xl">
          {formatCurrency(model.summaries.invested)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
