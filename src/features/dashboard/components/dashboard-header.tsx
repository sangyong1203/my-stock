"use client";

import { Info } from "lucide-react";
import { SessionControls } from "@/components/auth/session-controls";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCustomizeDialog } from "@/features/dashboard/components/dashboard-customize-dialog";
import { AutoSyncMarketPrices } from "@/features/market-data/components/auto-sync-market-prices";
import { MarketPriceSyncProvider } from "@/features/market-data/components/market-price-sync-provider";
import { MarketPriceSyncStatus } from "@/features/market-data/components/market-price-sync-status";
import { SyncMarketPricesButton } from "@/features/market-data/components/sync-market-prices-button";
import { CreateTransactionDialog } from "@/features/transactions/components/create-transaction-dialog";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

export function DashboardHeader({ model }: Props) {
  const { dashboard, displayName, isAuthenticated, syncStorageScope } = model;
  const modeLabel =
    dashboard.source === "database" ? "Portfolio Mode" : "Demo Mode";
  const modeDescription =
    dashboard.source === "database"
      ? "Shows your signed-in portfolio with average-cost accounting and synced market prices."
      : "Shows demo data until you sign in and create your own portfolio.";

  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 text-zinc-50 shadow-sm">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.25),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_40%)]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Investment Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              {dashboard.source === "database"
                ? "Signed-in portfolio with average-cost accounting and price sync"
                : "Average-cost accounting + transaction journal + notes"}
            </p>
          </div>
          {dashboard.warning ? (
            <p className="max-w-2xl rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              {dashboard.warning}
            </p>
          ) : null}
        </div>
        {isAuthenticated ? (
          <MarketPriceSyncProvider storageScope={syncStorageScope}>
            <AutoSyncMarketPrices enabled={isAuthenticated} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="inline-flex h-auto items-center gap-1.5 border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100"
                    >
                      <span>{modeLabel}</span>
                      <Info className="size-3.5" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{modeDescription}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <MarketPriceSyncStatus />
              <SyncMarketPricesButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" />
              <CreateTransactionDialog triggerClassName="bg-white/10 text-white hover:bg-white/20" />
              <DashboardCustomizeDialog />
              <ThemeToggle />
              <SessionControls
                isAuthenticated={isAuthenticated}
                displayName={displayName}
              />
            </div>
          </MarketPriceSyncProvider>
        ) : (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="inline-flex h-auto items-center gap-1.5 border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100"
                  >
                    <span>{modeLabel}</span>
                    <Info className="size-3.5" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{modeDescription}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
            <SessionControls
              isAuthenticated={isAuthenticated}
              displayName={displayName}
            />
          </div>
        )}
      </div>
    </header>
  );
}
