"use client";

import { RefreshCw } from "lucide-react";
import { useMarketPriceSync } from "@/features/market-data/components/market-price-sync-provider";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
};

export function SyncMarketPricesButton({ className }: Props) {
  const { isSyncing, runSync } = useMarketPriceSync();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={isSyncing}
      onClick={() => void runSync()}
    >
      <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
      Sync Portfolio
    </Button>
  );
}

