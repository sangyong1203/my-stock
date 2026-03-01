"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SyncResponse = {
  ok: boolean;
  message: string;
  updated?: number;
  skipped?: number;
  errors?: string[];
};

type RunSyncOptions = {
  silent?: boolean;
};

type MarketPriceSyncContextValue = {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastFailedAt: Date | null;
  lastErrorMessage: string | null;
  runSync: (options?: RunSyncOptions) => Promise<boolean>;
};

const MarketPriceSyncContext = createContext<MarketPriceSyncContextValue | null>(
  null,
);

type Props = {
  children: ReactNode;
  storageScope: string;
};

const STORAGE_KEY_PREFIX = "market-price-sync-state";

export function MarketPriceSyncProvider({ children, storageScope }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastFailedAt, setLastFailedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const isRunningRef = useRef(false);
  const router = useRouter();
  const storageKey = `${STORAGE_KEY_PREFIX}:${storageScope}`;

  useEffect(() => {
    setLastSyncedAt(null);
    setLastFailedAt(null);
    setLastErrorMessage(null);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        lastSyncedAt?: string | null;
        lastFailedAt?: string | null;
        lastErrorMessage?: string | null;
      };

      setLastSyncedAt(
        parsed.lastSyncedAt ? new Date(parsed.lastSyncedAt) : null,
      );
      setLastFailedAt(
        parsed.lastFailedAt ? new Date(parsed.lastFailedAt) : null,
      );
      setLastErrorMessage(parsed.lastErrorMessage ?? null);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
        lastFailedAt: lastFailedAt?.toISOString() ?? null,
        lastErrorMessage,
      }),
    );
  }, [lastErrorMessage, lastFailedAt, lastSyncedAt, storageKey]);

  const runSync = async ({ silent = false }: RunSyncOptions = {}) => {
    if (isRunningRef.current) {
      return false;
    }

    try {
      isRunningRef.current = true;
      setIsSyncing(true);

      const res = await fetch("/api/market-data/sync-prices", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json()) as SyncResponse;

      if (!res.ok || !data.ok) {
        setLastFailedAt(new Date());
        setLastErrorMessage(data.message || "Price sync failed.");
        if (!silent) {
          toast.error(data.message || "Price sync failed.");
        }
        return false;
      }

      setLastSyncedAt(new Date());
      setLastFailedAt(null);
      setLastErrorMessage(null);

      if (!silent) {
        const suffix =
          typeof data.updated === "number"
            ? ` Updated: ${data.updated}${typeof data.skipped === "number" ? `, Skipped: ${data.skipped}` : ""}`
            : "";
        toast.success(`${data.message}${suffix}`);
      }

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        if (!silent) {
          toast.warning(
            `Some symbols failed (${data.errors.length}). Check console for details.`,
          );
        }
        console.warn("Price sync warnings:", data.errors);
      }

      router.refresh();
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Price sync failed.";
      setLastFailedAt(new Date());
      setLastErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
      return false;
    } finally {
      isRunningRef.current = false;
      setIsSyncing(false);
    }
  };

  return (
    <MarketPriceSyncContext.Provider
      value={{
        isSyncing,
        lastSyncedAt,
        lastFailedAt,
        lastErrorMessage,
        runSync,
      }}
    >
      {children}
    </MarketPriceSyncContext.Provider>
  );
}

export function useMarketPriceSync() {
  const context = useContext(MarketPriceSyncContext);

  if (!context) {
    throw new Error(
      "useMarketPriceSync must be used within a MarketPriceSyncProvider.",
    );
  }

  return context;
}
