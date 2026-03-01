import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, positions, priceSnapshots, securities } from "@/db/schema";
import { getFinnhubQuote } from "@/features/market-data/server/finnhub";

const FINNHUB_SUPPORTED_MARKETS = new Set(["NASDAQ", "NYSE", "ETF"]);

export type SyncTarget = {
  securityId: string;
  symbol: string;
  market: string;
};

export type PriceSyncResult = {
  ok: true;
  message: string;
  updated: number;
  skipped: number;
  errors: string[];
};

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

function toDateOnly(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function toUniqueActiveTargets(
  rows: Array<{
    securityId: string;
    quantity: unknown;
    symbol: string;
    market: string;
  }>,
) {
  const uniqueActive = new Map<string, SyncTarget>();

  for (const row of rows) {
    if (Number(row.quantity) <= 0) {
      continue;
    }

    const key = `${row.securityId}:${row.symbol}:${row.market}`;
    if (!uniqueActive.has(key)) {
      uniqueActive.set(key, {
        securityId: row.securityId,
        symbol: row.symbol,
        market: row.market,
      });
    }
  }

  return [...uniqueActive.values()];
}

export async function getActiveTargetsForPortfolio(portfolioId: string) {
  const rows = await db
    .select({
      securityId: positions.securityId,
      quantity: positions.quantity,
      symbol: securities.symbol,
      market: securities.market,
    })
    .from(positions)
    .innerJoin(securities, eq(positions.securityId, securities.id))
    .where(eq(positions.portfolioId, portfolioId));

  return toUniqueActiveTargets(rows);
}

export async function getActiveTargetsForAllPortfolios() {
  const rows = await db
    .select({
      securityId: positions.securityId,
      quantity: positions.quantity,
      symbol: securities.symbol,
      market: securities.market,
    })
    .from(positions)
    .innerJoin(securities, eq(positions.securityId, securities.id));

  return toUniqueActiveTargets(rows);
}

export async function getPortfolioIdForUser(userId: string) {
  const [portfolio] = await db
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  return portfolio?.id ?? null;
}

export async function syncPricesForTargets(
  targets: SyncTarget[],
): Promise<PriceSyncResult> {
  console.log("[SyncPrices] active targets", {
    count: targets.length,
    symbols: targets.map((t) => `${t.symbol}:${t.market}`),
  });

  if (targets.length === 0) {
    return {
      ok: true,
      message: "No active positions found.",
      updated: 0,
      skipped: 0,
      errors: [],
    };
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const target of targets) {
    if (!FINNHUB_SUPPORTED_MARKETS.has(target.market)) {
      skipped += 1;
      errors.push(
        `${target.symbol} (${target.market}): market not supported by current Finnhub sync.`,
      );
      console.warn("[SyncPrices] skipped unsupported market", target);
      continue;
    }

    try {
      console.log("[SyncPrices] fetching", {
        symbol: target.symbol,
        market: target.market,
      });
      const quote = await getFinnhubQuote(target.symbol);
      const tradingDay = toDateOnly(quote.asOf);

      await db
        .insert(priceSnapshots)
        .values({
          securityId: target.securityId,
          tradingDay,
          closePrice: toNumeric(quote.price, 6),
          source: "finnhub",
        })
        .onConflictDoUpdate({
          target: [priceSnapshots.securityId, priceSnapshots.tradingDay],
          set: {
            closePrice: toNumeric(quote.price, 6),
            source: "finnhub",
          },
        });

      updated += 1;
      console.log("[SyncPrices] upserted snapshot", {
        symbol: target.symbol,
        market: target.market,
        price: quote.price,
        tradingDay: tradingDay.toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Finnhub error";
      errors.push(`${target.symbol} (${target.market}): ${message}`);
      console.error("[SyncPrices] fetch failed", {
        symbol: target.symbol,
        market: target.market,
        message,
      });
    }
  }

  console.log("[SyncPrices] completed", { updated, skipped, errorCount: errors.length });

  return {
    ok: true,
    message: `Price sync completed. Updated ${updated} symbols.`,
    updated,
    skipped,
    errors,
  };
}
