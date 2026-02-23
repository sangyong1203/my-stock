import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, positions, priceSnapshots, securities, transactions } from "@/db/schema";
import {
  EMPTY_POSITION,
  type PositionState,
  applyAverageCostTradeDetailed,
} from "@/lib/portfolio/average-cost";

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
};

export type DashboardData = {
  source: "database" | "demo";
  warning?: string;
  positions: DashboardPositionRow[];
  recentTransactions: DashboardTransactionRow[];
  realizedPnl: number;
  realizedReturnRate: number;
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
  realizedPnl: 0,
  realizedReturnRate: 0,
};

export async function getDashboardData(): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) {
    return FALLBACK_DATA;
  }

  try {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, DEMO_USER_ID))
      .limit(1);

    if (!portfolio) {
      return {
        ...FALLBACK_DATA,
        warning: "No portfolio found yet. Add a transaction to create your demo portfolio.",
      };
    }

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
      .where(eq(positions.portfolioId, portfolio.id));

    const filteredPositions = positionRows.filter((row) => Number(row.quantity) > 0);

    const securityIds = filteredPositions.map((row) => row.securityId);
    const snapshotRows =
      securityIds.length === 0
        ? []
        : await db
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

    const dashboardPositions: DashboardPositionRow[] = filteredPositions.map((row) => {
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

    const recentTransactionRows = await db
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
      .where(eq(transactions.portfolioId, portfolio.id))
      .orderBy(desc(transactions.tradeDate), desc(transactions.createdAt))
      .limit(8);

    const allTransactionRows = await db
      .select({
        securityId: transactions.securityId,
        side: transactions.side,
        quantity: transactions.quantity,
        unitPrice: transactions.unitPrice,
        feeAmount: transactions.feeAmount,
        taxAmount: transactions.taxAmount,
        tradeDate: transactions.tradeDate,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolio.id))
      .orderBy(
        asc(transactions.securityId),
        asc(transactions.tradeDate),
        asc(transactions.createdAt),
      );

    const positionStateBySecurity = new Map<string, PositionState>();
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
    }

    const realizedReturnRate =
      realizedCostBasisSold === 0 ? 0 : (realizedPnl / realizedCostBasisSold) * 100;

    return {
      source: "database",
      positions: dashboardPositions,
      recentTransactions: recentTransactionRows.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        side: row.side,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        feeAmount: Number(row.feeAmount),
        taxAmount: Number(row.taxAmount),
        tradeDate: row.tradeDate,
        executedAt: row.executedAt,
      })),
      realizedPnl,
      realizedReturnRate,
      warning:
        dashboardPositions.length === 0 && recentTransactionRows.length === 0
          ? "Database connected, but there is no data yet. Add your first transaction."
          : undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    return {
      ...FALLBACK_DATA,
      warning: `Database query failed (${message}). Showing demo data.`,
    };
  }
}
