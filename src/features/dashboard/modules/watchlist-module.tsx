"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { CreateWatchlistItemDialog } from "@/features/watchlist/components/create-watchlist-item-dialog";
import { DeleteWatchlistItemButton } from "@/features/watchlist/components/delete-watchlist-item-button";

function formatAddedAt(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

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
        <div className="module-watchlist-scroll flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-border/70 px-4 text-center text-muted-foreground">
              No watch list items yet. Add a symbol you want to monitor.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{item.symbol}</div>
                      <Badge variant="outline">{item.market}</Badge>
                      {item.isHeld ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">
                          Held
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.name}</div>
                  </div>
                  <DeleteWatchlistItemButton
                    watchlistItemId={item.id}
                    symbol={item.symbol}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Current
                    </div>
                    <div className="font-medium">
                      {item.currentPrice === null
                        ? "-"
                        : formatCurrency(item.currentPrice, item.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Added
                    </div>
                    <div className="font-medium">{formatAddedAt(item.createdAt)}</div>
                  </div>
                </div>
                {item.note ? (
                  <div className="mt-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
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
