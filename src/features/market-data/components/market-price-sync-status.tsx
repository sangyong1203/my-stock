"use client";

import { LoaderCircle } from "lucide-react";
import { useMarketPriceSync } from "@/features/market-data/components/market-price-sync-provider";

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export function MarketPriceSyncStatus() {
  const { isSyncing, lastSyncedAt, lastFailedAt, lastErrorMessage } =
    useMarketPriceSync();

  if (isSyncing) {
    return (
      <div className="inline-flex min-w-[170px] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-100">
        <LoaderCircle className="size-3.5 animate-spin" />
        Syncing...
      </div>
    );
  }

  if (lastFailedAt && (!lastSyncedAt || lastFailedAt > lastSyncedAt)) {
    return (
      <div
        className="inline-flex min-w-[170px] items-center rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100"
        title={lastErrorMessage ?? undefined}
      >
        {`Last failed at ${formatTime(lastFailedAt)}`}
      </div>
    );
  }

  return (
    <div className="inline-flex min-w-[170px] items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
      {lastSyncedAt
        ? `Last synced at ${formatTime(lastSyncedAt)}`
        : "Last synced at -"}
    </div>
  );
}

