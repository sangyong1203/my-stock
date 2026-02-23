"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SyncResponse = {
  ok: boolean;
  message: string;
  updated?: number;
  skipped?: number;
  errors?: string[];
};

type Props = {
  className?: string;
};

export function SyncMarketPricesButton({ className }: Props) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={isPending}
      onClick={async () => {
        try {
          setIsPending(true);
          const res = await fetch("/api/market-data/sync-prices", {
            method: "POST",
          });
          const data = (await res.json()) as SyncResponse;

          if (!res.ok || !data.ok) {
            toast.error(data.message || "Price sync failed.");
            return;
          }

          const suffix =
            typeof data.updated === "number"
              ? ` Updated: ${data.updated}${typeof data.skipped === "number" ? `, Skipped: ${data.skipped}` : ""}`
              : "";
          toast.success(`${data.message}${suffix}`);

          if (Array.isArray(data.errors) && data.errors.length > 0) {
            toast.warning(`Some symbols failed (${data.errors.length}). Check console for details.`);
            console.warn("Price sync warnings:", data.errors);
          }

          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Price sync failed.";
          toast.error(message);
        } finally {
          setIsPending(false);
        }
      }}
    >
      <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
      Sync Prices
    </Button>
  );
}
