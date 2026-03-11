"use client";

import { X } from "lucide-react";
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
      className="absolute right-[-12px] top-[22px] z-10 size-5 bg-[#e5484d] text-white opacity-0 transition-opacity hover:bg-[#e5484d] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
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
      <X className={`size-3.5 ${isPending ? "animate-pulse" : ""}`} />
    </Button>
  );
}
