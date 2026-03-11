"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCompactNumber, formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { CreateWatchlistItemDialog } from "@/features/watchlist/components/create-watchlist-item-dialog";
import { DeleteWatchlistItemButton } from "@/features/watchlist/components/delete-watchlist-item-button";

export function WatchlistModule({ model }: DashboardModuleProps) {
  const items = model.dashboard.watchlist;

  return (
    <Card className="module-card module-watchlist flex h-full min-w-0 flex-col border-border/70">
      <CardHeader className="module-card-header module-watchlist-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="module-watchlist-title">Watch List</CardTitle>
            <CardDescription className="module-watchlist-description">
              Track candidates before they become active positions.
            </CardDescription>
          </div>
          <CreateWatchlistItemDialog />
        </div>
      </CardHeader>
      <CardContent className="module-watchlist-content flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="module-watchlist-scroll flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [--app-scrollbar-thumb:transparent]">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-border/70 px-4 text-center text-muted-foreground">
              No watch list items yet. Add a symbol you want to monitor.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border/70 bg-muted/20 p-3"
              >
                <DeleteWatchlistItemButton
                  watchlistItemId={item.id}
                  symbol={item.symbol}
                />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <div className="shrink-0 font-medium">{item.symbol}</div>
                        <div className="min-w-0 truncate text-xs text-muted-foreground">
                          {item.name}
                        </div>
                      </div>
                      <div className="w-28 shrink-0 text-right font-medium">
                        {item.currentPrice === null
                          ? "-"
                          : formatCurrency(item.currentPrice, item.currency)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.isHeld ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">
                          Held
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {item.latestVolume === null
                      ? "-"
                      : `Vol ${formatCompactNumber(item.latestVolume)}`}
                  </div>
                  <div
                    className={`text-right text-sm font-medium ${
                      item.changeAmount === null && item.changePercent === null
                        ? "text-muted-foreground"
                        : (item.changeAmount ?? item.changePercent ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                    }`}
                  >
                    {item.changeAmount === null && item.changePercent === null
                      ? "-"
                      : [
                          item.changeAmount === null
                            ? null
                            : `${item.changeAmount >= 0 ? "+" : ""}${formatCurrency(item.changeAmount, item.currency)}`,
                          item.changePercent === null
                            ? null
                            : `(${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%)`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                  </div>
                </div>
                {item.note ? (
                  <div className="mt-2 line-clamp-2 rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground">
                    {item.note}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
