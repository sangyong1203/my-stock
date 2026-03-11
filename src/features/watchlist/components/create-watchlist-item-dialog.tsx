"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
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
import { createWatchlistItemAction } from "@/features/watchlist/actions/watchlist-actions";

const initialState = {
  success: false,
  message: "",
  itemId: undefined as string | undefined,
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving..." : "Save Watch Item"}
    </Button>
  );
}

export function CreateWatchlistItemDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createWatchlistItemAction, initialState);
  const [lookupPending, setLookupPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const symbolRef = useRef<HTMLInputElement>(null);
  const securityNameRef = useRef<HTMLInputElement>(null);
  const marketRef = useRef<HTMLSelectElement>(null);
  const currencyRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (state.success && state.itemId) {
      if (state.message) {
        toast.success(state.message);
      }
      formRef.current?.reset();
      const timer = window.setTimeout(() => setOpen(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [state.itemId, state.message, state.success]);

  useEffect(() => {
    if (!state.success && state.message) {
      toast.error(state.message);
    }
  }, [state.message, state.success]);

  async function handleSymbolLookup() {
    const symbol = symbolRef.current?.value.trim().toUpperCase() ?? "";
    if (!symbol || lookupPending) {
      return;
    }

    setLookupPending(true);

    try {
      const response = await fetch(
        `/api/market-data/security-lookup?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as
        | {
            ok: true;
            data: {
              symbol: string;
              securityName: string;
              market: string;
              currency: string;
            };
          }
        | { ok: false; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "Failed to load security data.",
        );
      }

      if (symbolRef.current) {
        symbolRef.current.value = payload.data.symbol;
      }
      if (securityNameRef.current) {
        securityNameRef.current.value = payload.data.securityName;
      }
      if (marketRef.current) {
        marketRef.current.value = payload.data.market;
      }
      if (currencyRef.current) {
        currencyRef.current.value = payload.data.currency;
      }

      toast.success(`Loaded ${payload.data.symbol} security data.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load security data.",
      );
    } finally {
      setLookupPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
          Add Watch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Watch List Item</DialogTitle>
          <DialogDescription>
            Track a security before it becomes an active position.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="watch-symbol">Symbol</Label>
              <Input
                id="watch-symbol"
                name="symbol"
                placeholder="MSFT"
                ref={symbolRef}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSymbolLookup();
                  }
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to auto-fill security data.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="watch-security-name">Security Name</Label>
              <Input
                id="watch-security-name"
                name="securityName"
                placeholder="Microsoft"
                ref={securityNameRef}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="watch-market">Market</Label>
              <select
                id="watch-market"
                name="market"
                defaultValue="NASDAQ"
                ref={marketRef}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="KRX">KRX</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="ETF">ETF</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="watch-currency">Currency</Label>
              <select
                id="watch-currency"
                name="currency"
                defaultValue="USD"
                ref={currencyRef}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="watch-note">Note</Label>
            <textarea
              id="watch-note"
              name="note"
              rows={4}
              placeholder="Catalyst, desired entry zone, thesis, or reminder..."
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
