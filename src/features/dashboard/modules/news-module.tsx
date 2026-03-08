"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardSelection } from "@/features/dashboard/components/dashboard-selection-provider";
import type { DashboardModuleProps } from "@/features/dashboard/types";

type NewsItem = {
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
  | { ok: true; mode: "general" | "portfolio"; items: NewsItem[] }
  | { ok: false; message?: string };

type NewsTab = "general" | "portfolio";

function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NewsList({
  items,
  emptyText,
}: {
  items: NewsItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-border/70 bg-muted/20 p-3 transition hover:border-primary/40 hover:bg-muted/30"
        >
          <div className="mb-1 text-xs text-muted-foreground">
            {item.source} · {item.category || "news"} ·{" "}
            {item.symbol ? `${item.symbol} · ` : ""}
            {formatPublishedAt(item.publishedAt)}
          </div>
          <div className="line-clamp-2 text-sm font-medium">{item.headline}</div>
          {item.summary ? (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {item.summary}
            </div>
          ) : null}
        </a>
      ))}
    </>
  );
}

export function NewsModule({ model }: DashboardModuleProps) {
  const { selectedSecurity, setSelectedSecurity } = useDashboardSelection();
  const [activeTab, setActiveTab] = useState<NewsTab>("general");
  const [generalItems, setGeneralItems] = useState<NewsItem[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const positions = model.dashboard.positions;
  const symbols = useMemo(
    () =>
      Array.from(
        new Set(
          positions
            .map((position) => position.symbol.trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    [positions],
  );
  const symbolsKey = symbols.join(",");
  const activeSecurity = useMemo(() => {
    const picked = positions.find(
      (position) =>
        position.symbol === selectedSecurity?.symbol &&
        position.market === selectedSecurity?.market,
    );
    return picked ?? positions[0] ?? null;
  }, [positions, selectedSecurity?.market, selectedSecurity?.symbol]);

  useEffect(() => {
    if (!selectedSecurity && positions[0]) {
      setSelectedSecurity({
        symbol: positions[0].symbol,
        market: positions[0].market,
      });
    }
  }, [positions, selectedSecurity, setSelectedSecurity]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [generalResponse, portfolioResponse] = await Promise.all([
          fetch("/api/market-data/news?mode=general", { cache: "no-store" }),
          fetch(
            `/api/market-data/news?mode=portfolio&symbols=${encodeURIComponent(
              symbolsKey,
            )}`,
            { cache: "no-store" },
          ),
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

        if (!cancelled) {
          setGeneralItems(generalPayload.items);
          setPortfolioItems(portfolioPayload.items);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setGeneralItems([]);
          setPortfolioItems([]);
          setError(
            fetchError instanceof Error ? fetchError.message : "Failed to load news.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [symbolsKey]);

  return (
    <Card className="module-card module-news flex h-full flex-col overflow-hidden border-border/70">
      <CardHeader className="module-card-header module-news-header shrink-0">
        <CardTitle className="module-news-title">News</CardTitle>
        <CardDescription className="module-news-description">
          General market news and portfolio-specific news from Finnhub.
        </CardDescription>
        <div className="module-news-tabs mt-2 inline-flex w-fit rounded-lg border border-border/70 bg-muted/20 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              activeTab === "general"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            General News
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              activeTab === "portfolio"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Portfolio News
          </button>
        </div>
      </CardHeader>
      <CardContent className="module-news-content flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="module-news-scroll flex h-0 min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
              Loading news...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              {error}
            </div>
          ) : activeTab === "general" ? (
            <NewsList items={generalItems} emptyText="No general market news." />
          ) : (
            <NewsList
              items={portfolioItems}
              emptyText={
                symbols.length === 0
                  ? "No holdings yet. Add positions to see portfolio news."
                  : activeSecurity
                    ? `No recent portfolio news for ${activeSecurity.symbol}.`
                    : "No recent portfolio news."
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

