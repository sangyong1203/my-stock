"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { createTransactionAction } from "@/features/transactions/actions/transaction-actions";
import { Badge } from "@/components/ui/badge";
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

const transactionActionInitialState = {
  success: false,
  message: "",
  createdTransactionId: undefined as string | undefined,
} as const;

function getCurrentDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentDateTimeLocalValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving..." : "Save Transaction"}
    </Button>
  );
}

type Props = {
  triggerClassName?: string;
};

export function CreateTransactionDialog({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    createTransactionAction,
    transactionActionInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const tradeDateRef = useRef<HTMLInputElement>(null);
  const executedAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    if (tradeDateRef.current && !tradeDateRef.current.value) {
      tradeDateRef.current.value = getCurrentDateValue();
    }
    if (executedAtRef.current && !executedAtRef.current.value) {
      executedAtRef.current.value = getCurrentDateTimeLocalValue();
    }
  }, [open]);

  useEffect(() => {
    if (state.success && state.createdTransactionId) {
      if (state.message) {
        toast.success(state.message);
      }
      formRef.current?.reset();
      const timer = window.setTimeout(() => setOpen(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [state.success, state.createdTransactionId, state.message]);

  useEffect(() => {
    if (!state.success && state.message) {
      toast.error(state.message);
    }
  }, [state.success, state.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className={triggerClassName}>
          Add Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Save a trade and update the position using average-cost accounting.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input id="symbol" name="symbol" placeholder="AAPL" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityName">Security Name</Label>
              <Input
                id="securityName"
                name="securityName"
                placeholder="Apple Inc."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <select
                id="market"
                name="market"
                defaultValue="NASDAQ"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="KRX">KRX</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="ETF">ETF</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                defaultValue="USD"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">Side</Label>
              <select
                id="side"
                name="side"
                defaultValue="buy"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="buy">BUY</option>
                <option value="sell">SELL</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeDate">Trade Date</Label>
              <Input
                id="tradeDate"
                name="tradeDate"
                type="date"
                required
                defaultValue={getCurrentDateValue()}
                ref={tradeDateRef}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="executedAt">Executed Time (Optional)</Label>
            <Input
              id="executedAt"
              name="executedAt"
              type="datetime-local"
              step="60"
              defaultValue={getCurrentDateTimeLocalValue()}
              ref={executedAtRef}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.00000001"
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                step="0.000001"
                placeholder="185.25"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feeAmount">Fee</Label>
              <Input
                id="feeAmount"
                name="feeAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxAmount">Tax</Label>
              <Input
                id="taxAmount"
                name="taxAmount"
                type="number"
                min="0"
                step="0.000001"
                defaultValue="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Trade Memo</Label>
            <textarea
              id="memo"
              name="memo"
              rows={3}
              placeholder="Entry/exit reason, risk checks, notes..."
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thesisNote">Security Note (Optional)</Label>
            <textarea
              id="thesisNote"
              name="thesisNote"
              rows={3}
              placeholder="Investment thesis, checklist, catalysts..."
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <Badge variant="outline">Uses demo portfolio when not signed in</Badge>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

