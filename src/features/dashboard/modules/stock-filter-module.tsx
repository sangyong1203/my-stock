"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCompactNumber, formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { ToggleWatchlistButton } from "@/features/watchlist/components/toggle-watchlist-button";

type ChangeFilter = "all" | "gainers" | "losers";
type MarketFilter = "all" | "NASDAQ" | "NYSE";

export function StockFilterModule({ model }: DashboardModuleProps) {
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState<MarketFilter>("all");
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all");
  const [volumeFilter, setVolumeFilter] = useState("all");

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase();

    return model.dashboard.stockList.filter((row) => {
      if (
        normalizedSearch &&
        !`${row.symbol} ${row.name}`.toUpperCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (market !== "all" && row.market !== market) {
        return false;
      }

      if (changeFilter === "gainers" && (row.changePercent ?? 0) < 0) {
        return false;
      }

      if (changeFilter === "losers" && (row.changePercent ?? 0) >= 0) {
        return false;
      }

      if (volumeFilter === "10m" && (row.latestVolume ?? 0) < 10_000_000) {
        return false;
      }

      if (volumeFilter === "25m" && (row.latestVolume ?? 0) < 25_000_000) {
        return false;
      }

      return true;
    });
  }, [changeFilter, market, model.dashboard.stockList, search, volumeFilter]);

  return (
    <Card className="module-card module-stock-filter flex h-full min-w-0 flex-col border-border/70">
      <CardHeader className="module-card-header module-stock-filter-header">
        <div>
          <CardTitle className="module-stock-filter-title">Stock Filter</CardTitle>
          <CardDescription className="module-stock-filter-description">
            Screen a stock list and push candidates into your watch list.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="module-stock-filter-content flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="module-stock-filter-controls flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search symbol or company"
            className="module-stock-filter-search h-9 min-w-[220px] rounded-md border border-border/70 bg-background px-3 text-sm"
          />
          <select
            value={market}
            onChange={(event) => setMarket(event.target.value as MarketFilter)}
            className="module-stock-filter-market h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
          >
            <option value="all">All Markets</option>
            <option value="NASDAQ">NASDAQ</option>
            <option value="NYSE">NYSE</option>
          </select>
          <select
            value={changeFilter}
            onChange={(event) =>
              setChangeFilter(event.target.value as ChangeFilter)
            }
            className="module-stock-filter-change h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
          >
            <option value="all">All Change</option>
            <option value="gainers">Gainers</option>
            <option value="losers">Losers</option>
          </select>
          <select
            value={volumeFilter}
            onChange={(event) => setVolumeFilter(event.target.value)}
            className="module-stock-filter-volume h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
          >
            <option value="all">All Volume</option>
            <option value="10m">Vol 10M+</option>
            <option value="25m">Vol 25M+</option>
          </select>
        </div>

        <div className="module-stock-filter-table-wrap min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 [--app-scrollbar-thumb:transparent]">
          <table className="module-stock-filter-table min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium text-right">Current</th>
                <th className="px-3 py-2 font-medium text-right">Change</th>
                <th className="px-3 py-2 font-medium text-right">P/L %</th>
                <th className="px-3 py-2 font-medium text-right">Vol</th>
                <th className="px-3 py-2 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    No stocks match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={`${row.symbol}:${row.market}`}
                    className="border-b border-border/50 bg-transparent transition-colors hover:bg-muted/20"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{row.symbol}</div>
                      <div className="text-xs text-muted-foreground">{row.market}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.name}</td>
                    <td className="px-3 py-2.5 text-right">
                      {row.currentPrice === null
                        ? "-"
                        : formatCurrency(row.currentPrice, row.currency)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${
                        row.changeAmount === null
                          ? "text-muted-foreground"
                          : row.changeAmount >= 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                      }`}
                    >
                      {row.changeAmount === null
                        ? "-"
                        : `${row.changeAmount >= 0 ? "+" : ""}${formatCurrency(row.changeAmount, row.currency)}`}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${
                        row.changePercent === null
                          ? "text-muted-foreground"
                          : row.changePercent >= 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                      }`}
                    >
                      {row.changePercent === null
                        ? "-"
                        : `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {row.latestVolume === null
                        ? "-"
                        : formatCompactNumber(row.latestVolume)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <ToggleWatchlistButton
                        watchlistItemId={row.watchlistItemId}
                        symbol={row.symbol}
                        securityName={row.name}
                        market={row.market}
                        currency={row.currency}
                        isActive={row.isWatchlisted}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
