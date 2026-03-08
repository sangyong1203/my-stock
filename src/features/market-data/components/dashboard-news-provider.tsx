"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DashboardNewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  symbol?: string;
};

type NewsResponse =
  | { ok: true; mode: "general" | "portfolio"; items: DashboardNewsItem[] }
  | { ok: false; message?: string };

type DashboardNewsSnapshot = {
  generalItems: DashboardNewsItem[];
  portfolioItems: DashboardNewsItem[];
  error: string | null;
  fetchedAt: number;
};

type DashboardNewsContextValue = {
  generalItems: DashboardNewsItem[];
  portfolioItems: DashboardNewsItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DashboardNewsContext = createContext<DashboardNewsContextValue | null>(null);
const CACHE_TTL_MS = 60_000;
const newsCache = new Map<string, DashboardNewsSnapshot>();

type Props = {
  children: ReactNode;
  symbols: string[];
};

export function DashboardNewsProvider({ children, symbols }: Props) {
  const symbolsKey = useMemo(
    () => symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean).join(","),
    [symbols],
  );
  const cacheKey = `news:${symbolsKey}`;
  const [generalItems, setGeneralItems] = useState<DashboardNewsItem[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<DashboardNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [generalResponse, portfolioResponse] = await Promise.all([
        fetch("/api/market-data/news?mode=general", { cache: "no-store" }),
        fetch(`/api/market-data/news?mode=portfolio&symbols=${encodeURIComponent(symbolsKey)}`, {
          cache: "no-store",
        }),
      ]);

      const [generalPayload, portfolioPayload] = (await Promise.all([
        generalResponse.json(),
        portfolioResponse.json(),
      ])) as [NewsResponse, NewsResponse];

      if (!generalResponse.ok || !generalPayload.ok) {
        throw new Error(
          "message" in generalPayload && generalPayload.message
            ? generalPayload.message
            : "Failed to load general news.",
        );
      }

      if (!portfolioResponse.ok || !portfolioPayload.ok) {
        throw new Error(
          "message" in portfolioPayload && portfolioPayload.message
            ? portfolioPayload.message
            : "Failed to load portfolio news.",
        );
      }

      setGeneralItems(generalPayload.items);
      setPortfolioItems(portfolioPayload.items);
      setError(null);
      newsCache.set(cacheKey, {
        generalItems: generalPayload.items,
        portfolioItems: portfolioPayload.items,
        error: null,
        fetchedAt: Date.now(),
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load news.";
      setGeneralItems([]);
      setPortfolioItems([]);
      setError(message);
      newsCache.set(cacheKey, {
        generalItems: [],
        portfolioItems: [],
        error: message,
        fetchedAt: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, [cacheKey, symbolsKey]);

  useEffect(() => {
    let cancelled = false;
    const cached = newsCache.get(cacheKey);

    if (cached) {
      setGeneralItems(cached.generalItems);
      setPortfolioItems(cached.portfolioItems);
      setError(cached.error);
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return;
      }
    }

    const execute = async () => {
      if (cancelled) {
        return;
      }
      await runFetch();
    };

    void execute();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, runFetch]);

  const value = useMemo<DashboardNewsContextValue>(
    () => ({
      generalItems,
      portfolioItems,
      loading,
      error,
      refresh: runFetch,
    }),
    [error, generalItems, loading, portfolioItems, runFetch],
  );

  return (
    <DashboardNewsContext.Provider value={value}>
      {children}
    </DashboardNewsContext.Provider>
  );
}

export function useDashboardNews() {
  const context = useContext(DashboardNewsContext);
  if (!context) {
    throw new Error("useDashboardNews must be used within DashboardNewsProvider.");
  }
  return context;
}
