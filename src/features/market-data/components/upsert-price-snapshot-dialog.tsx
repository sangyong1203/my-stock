"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { upsertPriceSnapshotAction } from "@/features/market-data/actions/price-snapshot-actions";
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

const initialState = {
  success: false,
  message: "",
} as const;

function getCurrentDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving..." : "Save Price"}
    </Button>
  );
}

type Props = {
  triggerClassName?: string;
};

export function UpsertPriceSnapshotDialog({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(upsertPriceSnapshotAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const tradingDayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (tradingDayRef.current && !tradingDayRef.current.value) {
      tradingDayRef.current.value = getCurrentDateValue();
    }
  }, [open]);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    if (tradingDayRef.current) {
      tradingDayRef.current.value = getCurrentDateValue();
    }
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [state.success, state.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          Update Price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Close Price</DialogTitle>
          <DialogDescription>
            Save a manual daily close price for a symbol already in your database.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price-symbol">Symbol</Label>
              <Input id="price-symbol" name="symbol" placeholder="AAPL" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-market">Market</Label>
              <select
                id="price-market"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tradingDay">Trading Day</Label>
              <Input
                id="tradingDay"
                name="tradingDay"
                type="date"
                required
                defaultValue={getCurrentDateValue()}
                ref={tradingDayRef}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closePrice">Close Price</Label>
              <Input
                id="closePrice"
                name="closePrice"
                type="number"
                min="0"
                step="0.000001"
                placeholder="202.35"
                required
              />
            </div>
          </div>

          {state.message ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                state.success
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <Badge variant="outline">Upsert by symbol + market + trading day</Badge>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

