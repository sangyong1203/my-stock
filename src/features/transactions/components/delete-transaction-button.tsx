"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteTransactionAction } from "@/features/transactions/actions/transaction-actions";
import { Button } from "@/components/ui/button";

type Props = {
  transactionId: string;
  symbol: string;
};

export function DeleteTransactionButton({ transactionId, symbol }: Props) {
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
        const confirmed = window.confirm(
          `Delete transaction for ${symbol}? This will recalculate the position.`,
        );
        if (!confirmed) return;

        try {
          setIsPending(true);
          const result = await deleteTransactionAction(transactionId);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
            return;
          }

          toast.error(result.message);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to delete transaction.";
          toast.error(message);
        } finally {
          setIsPending(false);
        }
      }}
      aria-label={`Delete transaction for ${symbol}`}
      title="Delete transaction"
    >
      <Trash2 className={`size-4 ${isPending ? "animate-pulse" : ""}`} />
    </Button>
  );
}

