"use client";

import { StarOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteWatchlistItemAction } from "@/features/watchlist/actions/watchlist-actions";

type Props = {
  watchlistItemId: string;
  symbol: string;
};

export function DeleteWatchlistItemButton({ watchlistItemId, symbol }: Props) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7 text-muted-foreground hover:text-rose-500"
      disabled={isPending}
      onClick={async () => {
        const confirmed = window.confirm(`Remove ${symbol} from watch list?`);
        if (!confirmed) {
          return;
        }

        try {
          setIsPending(true);
          const result = await deleteWatchlistItemAction(watchlistItemId);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
            return;
          }

          toast.error(result.message);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to delete watch list item.",
          );
        } finally {
          setIsPending(false);
        }
      }}
      aria-label={`Remove ${symbol} from watch list`}
      title="Remove from watch list"
    >
      <StarOff className={`size-4 ${isPending ? "animate-pulse" : ""}`} />
    </Button>
  );
}
