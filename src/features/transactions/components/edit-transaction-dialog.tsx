"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { updateTransactionAction } from "@/features/transactions/actions/transaction-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  transaction: {
    id: string;
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    unitPrice: number;
    feeAmount: number;
    taxAmount: number;
    tradeDate: Date;
    executedAt: Date | null;
  };
};

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeLocalValue(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function EditTransactionDialog({ transaction }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const defaults = useMemo(
    () => ({
      tradeDate: toDateValue(new Date(transaction.tradeDate)),
      executedAt: toDateTimeLocalValue(
        transaction.executedAt ? new Date(transaction.executedAt) : null,
      ),
    }),
    [transaction.executedAt, transaction.tradeDate],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Edit transaction for ${transaction.symbol}`}
          title="Edit transaction"
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update values and recalculate the position for {transaction.symbol}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            try {
              setIsPending(true);
              const result = await updateTransactionAction(formData);
              if (result.success) {
                toast.success(result.message);
                setOpen(false);
                router.refresh();
                return;
              }
              toast.error(result.message);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Failed to update transaction.";
              toast.error(message);
            } finally {
              setIsPending(false);
            }
          }}
        >
          <input type="hidden" name="transactionId" value={transaction.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-side-${transaction.id}`}>Side</Label>
              <select
                id={`edit-side-${transaction.id}`}
                name="side"
                defaultValue={transaction.side}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="buy">BUY</option>
                <option value="sell">SELL</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-trade-date-${transaction.id}`}>Trade Date</Label>
              <Input
                id={`edit-trade-date-${transaction.id}`}
                name="tradeDate"
                type="date"
                defaultValue={defaults.tradeDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-executed-at-${transaction.id}`}>Executed Time</Label>
            <Input
              id={`edit-executed-at-${transaction.id}`}
              name="executedAt"
              type="datetime-local"
              step="60"
              defaultValue={defaults.executedAt}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-quantity-${transaction.id}`}>Quantity</Label>
              <Input
                id={`edit-quantity-${transaction.id}`}
                name="quantity"
                type="number"
                min="0"
                step="0.00000001"
                defaultValue={transaction.quantity}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-unit-price-${transaction.id}`}>Unit Price</Label>
              <Input
                id={`edit-unit-price-${transaction.id}`}
                name="unitPrice"
                type="number"
                min="0"
                step="0.000001"
                defaultValue={transaction.unitPrice}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-fee-${transaction.id}`}>Fee</Label>
              <Input
                id={`edit-fee-${transaction.id}`}
                name="feeAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue={transaction.feeAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-tax-${transaction.id}`}>Tax</Label>
              <Input
                id={`edit-tax-${transaction.id}`}
                name="taxAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue={transaction.taxAmount}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

