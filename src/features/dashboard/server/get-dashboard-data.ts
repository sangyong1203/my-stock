import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  portfolios,
  positions,
  priceSnapshots,
  securities,
  transactions,
  watchlistItems,
} from "@/db/schema";
import { getMarketIndexSnapshots } from "@/features/market-data/server/market-index-service";
import {
  EMPTY_POSITION,
  type PositionState,
  applyAverageCostTradeDetailed,
} from "@/features/transactions/server/average-cost";
import { getFinnhubQuote } from "@/features/market-data/server/finnhub";
import { getLatestStockChartPoint } from "@/features/market-data/server/stock-chart-service";

export type DashboardPositionRow = {
  securityId: string;
  symbol: string;
  name: string;
  market: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  changeAmount: number | null;
  changePercent: number | null;
  latestVolume: number | null;
  currency: "KRW" | "USD";
};

export type DashboardTransactionRow = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  feeAmount: number;
  taxAmount: number;
  tradeDate: Date;
  executedAt: Date | null;
  realizedPnlDelta: number | null;
  realizedReturnRate: number | null;
};

export type DashboardChartTransactionRow = {
  id: string;
  symbol: string;
  market: string;
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  tradeDate: Date;
};

export type DashboardMarketIndexRow = {
  id: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  asOf: Date | null;
};

export type DashboardWatchlistRow = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  currency: "KRW" | "USD";
  currentPrice: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  latestVolume: number | null;
  note: string | null;
  createdAt: Date;
  isHeld: boolean;
};

export type DashboardData = {
  source: "database" | "demo";
  warning?: string;
  positions: DashboardPositionRow[];
  recentTransactions: DashboardTransactionRow[];
  chartTransactions: DashboardChartTransactionRow[];
  marketIndexes: DashboardMarketIndexRow[];
  watchlist: DashboardWatchlistRow[];
  realizedPnl: number;
  realizedReturnRate: number;
  userId: string | null;
};

const DEMO_USER_ID = "demo-user";
const FALLBACK_DATA: DashboardData = {
  source: "demo",
  warning: "Database not configured yet. Showing demo data.",
  positions: [
    {
      securityId: "demo-security-aapl",
      symbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      quantity: 12,
      avgCost: 188.42,
      currentPrice: 201.5,
      changeAmount: 2.41,
      changePercent: 1.21,
      latestVolume: 52300000,
      currency: "USD",
    },
    {
      securityId: "demo-security-nvda",
      symbol: "NVDA",
      name: "NVIDIA",
      market: "NASDAQ",
      quantity: 5,
      avgCost: 742.1,
      currentPrice: 711.4,
      changeAmount: -8.23,
      changePercent: -1.14,
      latestVolume: 41200000,
      currency: "USD",
    },
    {
      securityId: "demo-security-tsla",
      symbol: "TSLA",
      name: "Tesla",
      market: "NASDAQ",
      quantity: 8,
      avgCost: 176.25,
      currentPrice: 189.2,
      changeAmount: 3.65,
      changePercent: 1.97,
      latestVolume: 67800000,
      currency: "USD",
    },
  ],
  recentTransactions: [],
  chartTransactions: [],
  marketIndexes: [
    {
      id: "nasdaq",
      label: "NASDAQ",
      value: 22668.21,
      change: -210.17,
      changePercent: -0.91,
      sparkline: [22580, 22530, 22590, 22640, 22610, 22668.21],
      asOf: null,
    },
    {
      id: "sp500",
      label: "S&P 500",
      value: 6878.88,
      change: -29.98,
      changePercent: -0.43,
      sparkline: [6892, 6884, 6870, 6886, 6864, 6878.88],
      asOf: null,
    },
  ],
  watchlist: [
    {
      id: "demo-watch-msft",
      symbol: "MSFT",
      name: "Microsoft",
      market: "NASDAQ",
      currency: "USD",
      currentPrice: 418.35,
      changeAmount: 7.56,
      changePercent: 1.84,
      latestVolume: 18560000,
      note: "Cloud and AI watch candidate",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      isHeld: false,
    },
    {
      id: "demo-watch-amzn",
      symbol: "AMZN",
      name: "Amazon",
      market: "NASDAQ",
      currency: "USD",
      currentPrice: 203.11,
      changeAmount: -1.47,
      changePercent: -0.72,
      latestVolume: 8240000,
      note: "Retail + AWS pullback zone",
      createdAt: new Date("2026-03-02T00:00:00.000Z"),
      isHeld: false,
    },
  ],
  realizedPnl: 0,
  realizedReturnRate: 0,
  userId: null,
};

function buildMissingPortfolioResponse(
  userId: string | null | undefined,
  effectiveUserId: string,
  source: DashboardData["source"],
): DashboardData {
  return {
    ...FALLBACK_DATA,
    source,
    positions: [],
    recentTransactions: [],
    chartTransactions: [],
    watchlist: [],
    userId: effectiveUserId,
    warning: userId
      ? "No portfolio found for this account yet. Add your first transaction."
      : "No demo portfolio found yet. Add a transaction to create your demo portfolio.",
  };
}

async function getPortfolioPositions(portfolioId: string) {
  const positionRows = await db
    .select({
      positionId: positions.id,
      securityId: positions.securityId,
      quantity: positions.quantity,
      avgCostPerShare: positions.avgCostPerShare,
      symbol: securities.symbol,
      name: securities.name,
      market: securities.market,
      currency: securities.currency,
    })
    .from(positions)
    .innerJoin(securities, eq(positions.securityId, securities.id))
    .where(eq(positions.portfolioId, portfolioId));

  return positionRows.filter((row) => Number(row.quantity) > 0);
}

async function getLatestPricesBySecurity(securityIds: string[]) {
  if (securityIds.length === 0) {
    return new Map<string, number>();
  }

  const snapshotRows = await db
    .select()
    .from(priceSnapshots)
    .where(inArray(priceSnapshots.securityId, securityIds))
    .orderBy(desc(priceSnapshots.tradingDay));

  const latestPriceBySecurity = new Map<string, number>();
  for (const row of snapshotRows) {
    if (!latestPriceBySecurity.has(row.securityId)) {
      latestPriceBySecurity.set(row.securityId, Number(row.closePrice));
    }
  }

  return latestPriceBySecurity;
}

async function getLatestPriceSummaryBySecurity(securityIds: string[]) {
  if (securityIds.length === 0) {
    return new Map<
      string,
      {
        currentPrice: number;
        changeAmount: number | null;
        changePercent: number | null;
        latestVolume: number | null;
      }
    >();
  }

  const snapshotRows = await db
    .select({
      securityId: priceSnapshots.securityId,
      closePrice: priceSnapshots.closePrice,
      tradingDay: priceSnapshots.tradingDay,
    })
    .from(priceSnapshots)
    .where(inArray(priceSnapshots.securityId, securityIds))
    .orderBy(desc(priceSnapshots.tradingDay));

  const summaryBySecurity = new Map<
    string,
    { currentPrice: number; previousPrice: number | null; changePercent: number | null }
  >();

  for (const row of snapshotRows) {
    const price = Number(row.closePrice);
    const existing = summaryBySecurity.get(row.securityId);

    if (!existing) {
      summaryBySecurity.set(row.securityId, {
        currentPrice: price,
        previousPrice: null,
        changePercent: null,
      });
      continue;
    }

    if (existing.previousPrice === null) {
      existing.previousPrice = price;
      existing.changePercent =
        price > 0 ? ((existing.currentPrice - price) / price) * 100 : null;
    }
  }

  return new Map(
    [...summaryBySecurity.entries()].map(([securityId, summary]) => [
      securityId,
      {
        currentPrice: summary.currentPrice,
        changeAmount:
          summary.previousPrice !== null
            ? summary.currentPrice - summary.previousPrice
            : null,
        changePercent: summary.changePercent,
        latestVolume: null,
      },
    ]),
  );
}

const FINNHUB_SUPPORTED_MARKETS = new Set(["NASDAQ", "NYSE", "ETF"]);

async function getLiveTrackedPriceSummary(
  trackedRows: Array<{
    securityId: string;
    symbol: string;
    market: string;
  }>,
) {
  const uniqueRows = Array.from(
    new Map(
      trackedRows
        .filter((row) => FINNHUB_SUPPORTED_MARKETS.has(row.market))
        .map((row) => [row.securityId, row]),
    ).values(),
  );

  const quoteEntries = await Promise.all(
    uniqueRows.map(async (row) => {
      try {
        const [quote, latestPoint] = await Promise.all([
          getFinnhubQuote(row.symbol),
          getLatestStockChartPoint({
            symbol: row.symbol,
            market: row.market,
          }).catch(() => null),
        ]);

        return [
          row.securityId,
          {
            currentPrice: quote.price,
            changeAmount: quote.changeAmount,
            changePercent: quote.changePercent,
            latestVolume: latestPoint?.volume ?? null,
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(
    quoteEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  );
}

function buildDashboardPositions(
  filteredPositions: Awaited<ReturnType<typeof getPortfolioPositions>>,
  latestPriceBySecurity: Map<string, number>,
  latestPriceSummaryBySecurity: Map<
    string,
    {
      currentPrice: number;
      changeAmount: number | null;
      changePercent: number | null;
      latestVolume: number | null;
    }
  >,
  livePriceSummaryBySecurity: Map<
    string,
    {
      currentPrice: number;
      changeAmount: number | null;
      changePercent: number | null;
      latestVolume: number | null;
    }
  >,
): DashboardPositionRow[] {
  return filteredPositions.map((row) => {
    const avgCost = Number(row.avgCostPerShare);
    const liveSummary = livePriceSummaryBySecurity.get(row.securityId);
    const snapshotSummary = latestPriceSummaryBySecurity.get(row.securityId);

    return {
      securityId: row.securityId,
      symbol: row.symbol,
      name: row.name,
      market: row.market,
      quantity: Number(row.quantity),
      avgCost,
      currentPrice:
        liveSummary?.currentPrice ??
        snapshotSummary?.currentPrice ??
        latestPriceBySecurity.get(row.securityId) ??
        avgCost,
      changeAmount: liveSummary?.changeAmount ?? snapshotSummary?.changeAmount ?? null,
      changePercent:
        liveSummary?.changePercent ?? snapshotSummary?.changePercent ?? null,
      latestVolume: liveSummary?.latestVolume ?? snapshotSummary?.latestVolume ?? null,
      currency: row.currency,
    };
  });
}

async function getRecentTransactions(portfolioId: string) {
  return db
    .select({
      id: transactions.id,
      side: transactions.side,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      feeAmount: transactions.feeAmount,
      taxAmount: transactions.taxAmount,
      tradeDate: transactions.tradeDate,
      executedAt: transactions.executedAt,
      symbol: securities.symbol,
    })
    .from(transactions)
    .innerJoin(securities, eq(transactions.securityId, securities.id))
    .where(eq(transactions.portfolioId, portfolioId))
    .orderBy(desc(transactions.tradeDate), desc(transactions.createdAt))
    .limit(8);
}

async function getWatchlistItems(portfolioId: string) {
  return db
    .select({
      id: watchlistItems.id,
      securityId: watchlistItems.securityId,
      symbol: securities.symbol,
      name: securities.name,
      market: securities.market,
      currency: securities.currency,
      note: watchlistItems.note,
      createdAt: watchlistItems.createdAt,
    })
    .from(watchlistItems)
    .innerJoin(securities, eq(watchlistItems.securityId, securities.id))
    .where(eq(watchlistItems.portfolioId, portfolioId))
    .orderBy(desc(watchlistItems.createdAt));
}

async function getAllTransactionsForRealizedPnl(portfolioId: string) {
  return db
    .select({
      securityId: transactions.securityId,
      id: transactions.id,
      side: transactions.side,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      feeAmount: transactions.feeAmount,
      taxAmount: transactions.taxAmount,
      tradeDate: transactions.tradeDate,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.portfolioId, portfolioId))
    .orderBy(
      asc(transactions.securityId),
      asc(transactions.tradeDate),
      asc(transactions.createdAt),
    );
}

async function getAllTransactionsForChart(portfolioId: string) {
  return db
    .select({
      id: transactions.id,
      side: transactions.side,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      tradeDate: transactions.tradeDate,
      symbol: securities.symbol,
      market: securities.market,
    })
    .from(transactions)
    .innerJoin(securities, eq(transactions.securityId, securities.id))
    .where(eq(transactions.portfolioId, portfolioId))
    .orderBy(asc(transactions.tradeDate), asc(transactions.createdAt));
}

function calculateRealizedMetrics(
  allTransactionRows: Awaited<ReturnType<typeof getAllTransactionsForRealizedPnl>>,
) {
  const positionStateBySecurity = new Map<string, PositionState>();
  const realizedByTransactionId = new Map<
    string,
    { realizedPnlDelta: number | null; realizedReturnRate: number | null }
  >();
  let realizedPnl = 0;
  let realizedCostBasisSold = 0;

  for (const row of allTransactionRows) {
    const current = positionStateBySecurity.get(row.securityId) ?? EMPTY_POSITION;
    const result = applyAverageCostTradeDetailed(current, {
      side: row.side,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      feeAmount: Number(row.feeAmount),
      taxAmount: Number(row.taxAmount),
    });
    positionStateBySecurity.set(row.securityId, result.next);
    realizedPnl += result.realizedDelta;
    realizedCostBasisSold += result.soldCostBasis;
    realizedByTransactionId.set(row.id, {
      realizedPnlDelta: row.side === "sell" ? result.realizedDelta : null,
      realizedReturnRate:
        row.side === "sell" && result.soldCostBasis > 0
          ? (result.realizedDelta / result.soldCostBasis) * 100
          : null,
    });
  }

  return {
    realizedPnl,
    realizedReturnRate:
      realizedCostBasisSold === 0 ? 0 : (realizedPnl / realizedCostBasisSold) * 100,
    realizedByTransactionId,
  };
}

function buildDashboardTransactions(
  recentTransactionRows: Awaited<ReturnType<typeof getRecentTransactions>>,
  realizedByTransactionId: Map<
    string,
    { realizedPnlDelta: number | null; realizedReturnRate: number | null }
  >,
): DashboardTransactionRow[] {
  return recentTransactionRows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    feeAmount: Number(row.feeAmount),
    taxAmount: Number(row.taxAmount),
    tradeDate: row.tradeDate,
    executedAt: row.executedAt,
    realizedPnlDelta: realizedByTransactionId.get(row.id)?.realizedPnlDelta ?? null,
    realizedReturnRate:
      realizedByTransactionId.get(row.id)?.realizedReturnRate ?? null,
  }));
}

function buildDashboardChartTransactions(
  transactionRows: Awaited<ReturnType<typeof getAllTransactionsForChart>>,
): DashboardChartTransactionRow[] {
  return transactionRows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    market: row.market,
    side: row.side,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    tradeDate: row.tradeDate,
  }));
}

function buildDashboardWatchlist(
  watchlistRows: Awaited<ReturnType<typeof getWatchlistItems>>,
  latestPriceSummaryBySecurity: Map<
    string,
    {
      currentPrice: number;
      changeAmount: number | null;
      changePercent: number | null;
      latestVolume: number | null;
    }
  >,
  livePriceSummaryBySecurity: Map<
    string,
    {
      currentPrice: number;
      changeAmount: number | null;
      changePercent: number | null;
      latestVolume: number | null;
    }
  >,
  heldSecurityIds: Set<string>,
): DashboardWatchlistRow[] {
  return watchlistRows.map((row) => {
    const liveSummary = livePriceSummaryBySecurity.get(row.securityId);
    const snapshotSummary = latestPriceSummaryBySecurity.get(row.securityId);

    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      market: row.market,
      currency: row.currency,
      currentPrice: liveSummary?.currentPrice ?? snapshotSummary?.currentPrice ?? null,
      changeAmount: liveSummary?.changeAmount ?? snapshotSummary?.changeAmount ?? null,
      changePercent: liveSummary?.changePercent ?? snapshotSummary?.changePercent ?? null,
      latestVolume: liveSummary?.latestVolume ?? snapshotSummary?.latestVolume ?? null,
      note: row.note,
      createdAt: row.createdAt,
      isHeld: heldSecurityIds.has(row.securityId),
    };
  });
}

function getDashboardWarning(
  userId: string | null | undefined,
  dashboardPositions: DashboardPositionRow[],
  recentTransactions: DashboardTransactionRow[],
) {
  if (dashboardPositions.length !== 0 || recentTransactions.length !== 0) {
    return undefined;
  }

  return userId
    ? "Portfolio connected, but there is no data yet. Add your first transaction."
    : "Database connected, but there is no data yet. Add your first transaction.";
}

export async function getDashboardData(userId?: string | null): Promise<DashboardData> {
  const marketIndexes = await getMarketIndexSnapshots().catch(() => FALLBACK_DATA.marketIndexes);

  if (!process.env.DATABASE_URL) {
    return {
      ...FALLBACK_DATA,
      marketIndexes,
    };
  }

  try {
    const effectiveUserId = userId ?? DEMO_USER_ID;
    const source = userId ? "database" : "demo";
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, effectiveUserId))
      .limit(1);

    if (!portfolio) {
      return buildMissingPortfolioResponse(userId, effectiveUserId, source);
    }

    const filteredPositions = await getPortfolioPositions(portfolio.id);
    const watchlistRows = await getWatchlistItems(portfolio.id);
    const securityIds = Array.from(
      new Set([
        ...filteredPositions.map((row) => row.securityId),
        ...watchlistRows.map((row) => row.securityId),
      ]),
    );
    const latestPriceBySecurity = await getLatestPricesBySecurity(securityIds);
    const latestPriceSummaryBySecurity =
      await getLatestPriceSummaryBySecurity(securityIds);
    const liveTrackedPriceSummaryBySecurity = await getLiveTrackedPriceSummary([
      ...filteredPositions.map((row) => ({
        securityId: row.securityId,
        symbol: row.symbol,
        market: row.market,
      })),
      ...watchlistRows.map((row) => ({
        securityId: row.securityId,
        symbol: row.symbol,
        market: row.market,
      })),
    ]);
    const dashboardPositions = buildDashboardPositions(
      filteredPositions,
      latestPriceBySecurity,
      latestPriceSummaryBySecurity,
      liveTrackedPriceSummaryBySecurity,
    );
    const dashboardWatchlist = buildDashboardWatchlist(
      watchlistRows,
      latestPriceSummaryBySecurity,
      liveTrackedPriceSummaryBySecurity,
      new Set(filteredPositions.map((row) => row.securityId)),
    );
    const recentTransactionRows = await getRecentTransactions(portfolio.id);
    const allTransactionRows = await getAllTransactionsForRealizedPnl(portfolio.id);
    const chartTransactionRows = await getAllTransactionsForChart(portfolio.id);
    const { realizedPnl, realizedReturnRate, realizedByTransactionId } =
      calculateRealizedMetrics(allTransactionRows);
    const recentTransactions = buildDashboardTransactions(
      recentTransactionRows,
      realizedByTransactionId,
    );
    const chartTransactions = buildDashboardChartTransactions(chartTransactionRows);

    return {
      source,
      positions: dashboardPositions,
      recentTransactions,
      chartTransactions,
      marketIndexes,
      watchlist: dashboardWatchlist,
      realizedPnl,
      realizedReturnRate,
      userId: effectiveUserId,
      warning: getDashboardWarning(userId, dashboardPositions, recentTransactions),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    return {
      ...FALLBACK_DATA,
      marketIndexes,
      warning: `Database query failed (${message}). Showing demo data.`,
    };
  }
}

