"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleWatchlistItemAction } from "@/features/watchlist/actions/watchlist-actions";

type Props = {
  watchlistItemId: string | null;
  symbol: string;
  securityName: string;
  market: string;
  currency: string;
  isActive: boolean;
};

export function ToggleWatchlistButton({
  watchlistItemId,
  symbol,
  securityName,
  market,
  currency,
  isActive,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={isPending}
      onClick={async () => {
        try {
          setIsPending(true);
          const result = await toggleWatchlistItemAction({
            watchlistItemId,
            symbol,
            securityName,
            market,
            currency,
          });

          if (!result.success) {
            toast.error(result.message);
            return;
          }

          toast.success(result.message);
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update watch list.",
          );
        } finally {
          setIsPending(false);
        }
      }}
      className={`size-7 rounded-md border transition-colors ${
        isActive
          ? "border-orange-400 bg-orange-400/10 text-orange-400 hover:bg-orange-400/15 hover:text-orange-300"
          : "border-zinc-600 bg-transparent text-zinc-400 hover:bg-transparent hover:text-zinc-200"
      }`}
      aria-label={
        isActive
          ? `Remove ${symbol} from watch list`
          : `Add ${symbol} to watch list`
      }
      title={isActive ? "In watch list" : "Add to watch list"}
    >
      <Star
        className={`size-3.5 ${isPending ? "animate-pulse" : ""}`}
        fill={isActive ? "currentColor" : "none"}
      />
    </Button>
  );
}
