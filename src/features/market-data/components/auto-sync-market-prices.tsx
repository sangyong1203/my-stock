"use client";

import { useEffect } from "react";
import { useMarketPriceSync } from "@/features/market-data/components/market-price-sync-provider";

type Props = {
  enabled: boolean;
  intervalMs?: number;
};

export function AutoSyncMarketPrices({
  enabled,
  intervalMs = 60_000,
}: Props) {
  const { runSync } = useMarketPriceSync();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (cancelled) {
        return;
      }
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      try {
        if (!cancelled) {
          await runSync({ silent: true });
        }
      } catch {
        // Ignore polling errors here. Manual sync button remains the explicit recovery path.
      }
    };

    const interval = window.setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs, runSync]);

  return null;
}

