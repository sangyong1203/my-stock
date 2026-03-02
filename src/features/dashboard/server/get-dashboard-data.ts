import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, positions, priceSnapshots, securities, transactions } from "@/db/schema";
import { getMarketIndexSnapshots } from "@/features/market-data/server/market-index-service";
import {
  EMPTY_POSITION,
  type PositionState,
  applyAverageCostTradeDetailed,
} from "@/features/transactions/server/average-cost";

export type DashboardPositionRow = {
  symbol: string;
  name: string;
  market: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
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

export type DashboardData = {
  source: "database" | "demo";
  warning?: string;
  positions: DashboardPositionRow[];
  recentTransactions: DashboardTransactionRow[];
  chartTransactions: DashboardChartTransactionRow[];
  marketIndexes: DashboardMarketIndexRow[];
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
      symbol: "AAPL",
      name: "Apple",
      market: "NASDAQ",
      quantity: 12,
      avgCost: 188.42,
      currentPrice: 201.5,
      currency: "USD",
    },
    {
      symbol: "NVDA",
      name: "NVIDIA",
      market: "NASDAQ",
      quantity: 5,
      avgCost: 742.1,
      currentPrice: 711.4,
      currency: "USD",
    },
    {
      symbol: "TSLA",
      name: "Tesla",
      market: "NASDAQ",
      quantity: 8,
      avgCost: 176.25,
      currentPrice: 189.2,
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

function buildDashboardPositions(
  filteredPositions: Awaited<ReturnType<typeof getPortfolioPositions>>,
  latestPriceBySecurity: Map<string, number>,
): DashboardPositionRow[] {
  return filteredPositions.map((row) => {
    const avgCost = Number(row.avgCostPerShare);
    return {
      symbol: row.symbol,
      name: row.name,
      market: row.market,
      quantity: Number(row.quantity),
      avgCost,
      currentPrice: latestPriceBySecurity.get(row.securityId) ?? avgCost,
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
    const securityIds = filteredPositions.map((row) => row.securityId);
    const latestPriceBySecurity = await getLatestPricesBySecurity(securityIds);
    const dashboardPositions = buildDashboardPositions(
      filteredPositions,
      latestPriceBySecurity,
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

