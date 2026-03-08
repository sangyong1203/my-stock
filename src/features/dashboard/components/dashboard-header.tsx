"use client";

import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { SessionControls } from "@/components/auth/session-controls";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCustomizeDialog } from "@/features/dashboard/components/dashboard-customize-dialog";
import { useDashboardLayout } from "@/features/dashboard/components/dashboard-layout-provider";
import {
  dashboardModuleRegistry,
  getDashboardModuleWidthPx,
} from "@/features/dashboard/registry";
import { AutoSyncMarketPrices } from "@/features/market-data/components/auto-sync-market-prices";
import { useDashboardNews } from "@/features/market-data/components/dashboard-news-provider";
import { MarketPriceSyncStatus } from "@/features/market-data/components/market-price-sync-status";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getTickerPrefix(item: { symbol?: string; source?: string }) {
  const symbol = item.symbol?.trim();
  if (symbol) {
    return symbol;
  }

  const source = item.source?.trim();
  return source && source.length > 0 ? source : "News";
}

export function DashboardHeader({ model }: Props) {
  const { dashboard, displayName, isAuthenticated } = model;
  const { layout } = useDashboardLayout();
  const { generalItems } = useDashboardNews();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const modeLabel =
    dashboard.source === "database" ? "Portfolio Mode" : "Demo Mode";
  const modeDescription =
    dashboard.source === "database"
      ? "Shows your signed-in portfolio with average-cost accounting and synced market prices."
      : "Shows demo data until you sign in and create your own portfolio.";
  const summaryModules = layout.summary.map((moduleId) => {
    const moduleDefinition = dashboardModuleRegistry[moduleId];
    if (!moduleDefinition) {
      return null;
    }

    const Component = moduleDefinition.component;
    const widthPx = getDashboardModuleWidthPx(moduleId, layout.widths[moduleId]);
    return (
      <div
        key={moduleDefinition.id}
        className="shrink-0 self-stretch"
        style={{
          width: `${widthPx}px`,
          minWidth: `${widthPx}px`,
        }}
      >
        <Component model={model} />
      </div>
    );
  });
  const todayGeneralItems = useMemo(() => {
    const today = new Date();
    return generalItems.filter((item) => {
      const publishedAt = new Date(item.publishedAt);
      return !Number.isNaN(publishedAt.getTime()) && isSameLocalDay(publishedAt, today);
    });
  }, [generalItems]);
  const tickerText = useMemo(
    () =>
      todayGeneralItems
        .filter((item) => item.headline)
        .map((item) => `[ ${getTickerPrefix(item)} ] ${item.headline}`)
        .join(""),
    [todayGeneralItems],
  );
  const tickerItems = useMemo(
    () =>
      todayGeneralItems
        .filter((item) => item.headline)
        .map((item) => `[ ${getTickerPrefix(item)} ] ${item.headline}`),
    [todayGeneralItems],
  );

  return (
    <div className="dashboard-header-wrap relative overflow-visible">
      <header className="dashboard-header relative overflow-visible rounded-3xl border border-border/70 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4 text-zinc-50 shadow-sm">
        <div className="dashboard-header-background absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.25),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_40%)]" />
        <div className="dashboard-header-content relative flex flex-col gap-3">
          <div className="dashboard-header-top flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="dashboard-header-copy space-y-3">
              <div className="dashboard-header-title-group">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Investment Dashboard
                </h1>
              </div>
              {dashboard.warning ? (
                <p className="dashboard-header-warning max-w-2xl rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  {dashboard.warning}
                </p>
              ) : null}
            </div>
            {isAuthenticated ? (
              <>
                <AutoSyncMarketPrices enabled={isAuthenticated} />
                <div className="dashboard-header-controls flex flex-wrap items-center justify-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="dashboard-header-mode-badge inline-flex h-auto items-center gap-1.5 border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100"
                        >
                          <span>{modeLabel}</span>
                          <Info className="size-3.5" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>{modeDescription}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <MarketPriceSyncStatus />
                  <DashboardCustomizeDialog />
                  <ThemeToggle />
                  <SessionControls
                    isAuthenticated={isAuthenticated}
                    displayName={displayName}
                  />
                </div>
              </>
            ) : (
              <div className="dashboard-header-controls flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="dashboard-header-mode-badge inline-flex h-auto items-center gap-1.5 border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100"
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
          <div className="dashboard-portfolio-news-line h-8 overflow-hidden rounded-sm bg-black/20 px-0">
            {tickerText ? (
              <div className="dashboard-portfolio-news-marquee py-1 text-sm text-zinc-200">
                <div className="dashboard-portfolio-news-marquee-track">
                  {tickerItems.map((item, index) => (
                    <span key={`news-primary-${index}`}>{item}</span>
                  ))}
                  {tickerItems.map((item, index) => (
                    <span key={`news-secondary-${index}`} aria-hidden>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center text-xs text-zinc-400">
                No general news today.
              </div>
            )}
          </div>
          {isSummaryExpanded ? (
            <div className="dashboard-summary-row grid grid-rows-[1fr] opacity-100">
              <div className="dashboard-summary-row-inner min-h-0 overflow-hidden">
                <div className="dashboard-summary-row-scroll overflow-x-auto pb-1">
                  <div className="dashboard-summary-row-track flex min-w-max items-stretch gap-4">
                    {summaryModules}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>
      <div className="dashboard-summary-toggle absolute inset-x-0 -bottom-2.5 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          aria-label={isSummaryExpanded ? "Collapse summary row" : "Expand summary row"}
          className="dashboard-summary-toggle-button h-[10px] w-20 rounded-b-full rounded-t-none border border-t-0 border-border/60 bg-zinc-900/95 p-0 text-zinc-300 shadow-none hover:bg-border/60 hover:text-white"
          onClick={() => setIsSummaryExpanded((current) => !current)}
        >
          {isSummaryExpanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
