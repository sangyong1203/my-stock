import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  portfolios,
  positions,
  securities,
  securityNotes,
  transactionNotes,
  transactions,
  users,
} from "@/db/schema";
import { EMPTY_POSITION, applyAverageCostTrade } from "@/features/transactions/server/average-cost";

const DEMO_USER_ID = "demo-user";
const DEMO_PORTFOLIO_ID = "demo-portfolio";

export const MARKETS = ["KRX", "NASDAQ", "NYSE", "ETF"] as const;
export const CURRENCIES = ["KRW", "USD"] as const;

export type Market = (typeof MARKETS)[number];
export type Currency = (typeof CURRENCIES)[number];

export type CreateTransactionInput = {
  userId: string | null;
  side: "buy" | "sell";
  market: Market;
  symbol: string;
  securityName: string;
  currency: Currency;
  quantity: number;
  unitPrice: number;
  feeAmount: number;
  taxAmount: number;
  tradeDate: string;
  executedAt: string;
  memo: string;
  thesisNote: string;
};

export type UpdateTransactionInput = {
  transactionId: string;
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  feeAmount: number;
  taxAmount: number;
  tradeDate: string;
  executedAt: string;
};

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

export function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/\s+/g, "");
}

async function recalculatePositionForSecurityTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  portfolioId: string,
  securityId: string,
) {
  const remainingTransactions = await tx
    .select({
      side: transactions.side,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      feeAmount: transactions.feeAmount,
      taxAmount: transactions.taxAmount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.portfolioId, portfolioId),
        eq(transactions.securityId, securityId),
      ),
    )
    .orderBy(asc(transactions.tradeDate), asc(transactions.createdAt));

  let nextPosition = EMPTY_POSITION;
  for (const row of remainingTransactions) {
    nextPosition = applyAverageCostTrade(nextPosition, {
      side: row.side,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      feeAmount: Number(row.feeAmount),
      taxAmount: Number(row.taxAmount),
    });
  }

  const [existingPosition] = await tx
    .select({ id: positions.id })
    .from(positions)
    .where(
      and(eq(positions.portfolioId, portfolioId), eq(positions.securityId, securityId)),
    )
    .limit(1);

  if (remainingTransactions.length === 0 || nextPosition.quantity === 0) {
    if (existingPosition) {
      await tx.delete(positions).where(eq(positions.id, existingPosition.id));
    }
    return;
  }

  if (existingPosition) {
    await tx
      .update(positions)
      .set({
        quantity: toNumeric(nextPosition.quantity, 8),
        avgCostPerShare: toNumeric(nextPosition.avgCostPerShare, 6),
        totalCostBasis: toNumeric(nextPosition.totalCostBasis, 6),
        realizedPnl: toNumeric(nextPosition.realizedPnl, 6),
        lastCalculatedAt: new Date(),
      })
      .where(eq(positions.id, existingPosition.id));
    return;
  }

  await tx.insert(positions).values({
    id: randomUUID(),
    portfolioId,
    securityId,
    quantity: toNumeric(nextPosition.quantity, 8),
    avgCostPerShare: toNumeric(nextPosition.avgCostPerShare, 6),
    totalCostBasis: toNumeric(nextPosition.totalCostBasis, 6),
    realizedPnl: toNumeric(nextPosition.realizedPnl, 6),
  });
}

async function ensurePortfolio(userId: string, currency: Currency) {
  const [existing] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const id = userId === DEMO_USER_ID ? DEMO_PORTFOLIO_ID : randomUUID();
  await db.insert(portfolios).values({
    id,
    userId,
    name: userId === DEMO_USER_ID ? "Demo Portfolio" : "My Portfolio",
    currency,
  });

  const [created] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.id, id))
    .limit(1);

  if (!created) {
    throw new Error("Failed to create portfolio");
  }

  return created;
}

async function ensureDemoUser() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);

  if (existing) {
    return existing;
  }

  await db.insert(users).values({
    id: DEMO_USER_ID,
    name: "Demo User",
    email: "demo@local.mystock",
  });

  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);

  if (!created) {
    throw new Error("Failed to create demo user");
  }

  return created;
}

export async function createTransaction(input: CreateTransactionInput) {
  const userId = input.userId ?? (await ensureDemoUser()).id;
  const portfolio = await ensurePortfolio(userId, input.currency);

  const [existingSecurity] = await db
    .select()
    .from(securities)
    .where(and(eq(securities.symbol, input.symbol), eq(securities.market, input.market)))
    .limit(1);

  let securityId = existingSecurity?.id;

  if (!securityId) {
    securityId = randomUUID();
    await db.insert(securities).values({
      id: securityId,
      symbol: input.symbol,
      market: input.market,
      name: input.securityName,
      currency: input.currency,
    });
  }

  const [currentPositionRow] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.portfolioId, portfolio.id),
        eq(positions.securityId, securityId),
      ),
    )
    .limit(1);

  const currentPosition = currentPositionRow
    ? {
        quantity: Number(currentPositionRow.quantity),
        avgCostPerShare: Number(currentPositionRow.avgCostPerShare),
        totalCostBasis: Number(currentPositionRow.totalCostBasis),
        realizedPnl: Number(currentPositionRow.realizedPnl),
      }
    : EMPTY_POSITION;

  const nextPosition = applyAverageCostTrade(currentPosition, {
    side: input.side,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    feeAmount: input.feeAmount,
    taxAmount: input.taxAmount,
  });

  const transactionId = randomUUID();
  const tradeDateValue = new Date(`${input.tradeDate}T00:00:00`);
  const executedAtValue = input.executedAt ? new Date(input.executedAt) : null;

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id: transactionId,
      portfolioId: portfolio.id,
      securityId,
      side: input.side,
      quantity: toNumeric(input.quantity, 8),
      unitPrice: toNumeric(input.unitPrice, 6),
      feeAmount: toNumeric(input.feeAmount, 6),
      taxAmount: toNumeric(input.taxAmount, 6),
      tradeDate: tradeDateValue,
      executedAt: executedAtValue,
      memo: input.memo || null,
    });

    if (currentPositionRow) {
      await tx
        .update(positions)
        .set({
          quantity: toNumeric(nextPosition.quantity, 8),
          avgCostPerShare: toNumeric(nextPosition.avgCostPerShare, 6),
          totalCostBasis: toNumeric(nextPosition.totalCostBasis, 6),
          realizedPnl: toNumeric(nextPosition.realizedPnl, 6),
          lastCalculatedAt: new Date(),
        })
        .where(eq(positions.id, currentPositionRow.id));
    } else {
      await tx.insert(positions).values({
        id: randomUUID(),
        portfolioId: portfolio.id,
        securityId,
        quantity: toNumeric(nextPosition.quantity, 8),
        avgCostPerShare: toNumeric(nextPosition.avgCostPerShare, 6),
        totalCostBasis: toNumeric(nextPosition.totalCostBasis, 6),
        realizedPnl: toNumeric(nextPosition.realizedPnl, 6),
      });
    }

    if (input.memo) {
      await tx.insert(transactionNotes).values({
        id: randomUUID(),
        transactionId,
        body: input.memo,
      });
    }

    if (input.thesisNote) {
      await tx.insert(securityNotes).values({
        id: randomUUID(),
        portfolioId: portfolio.id,
        securityId,
        title: `${input.symbol} thesis note`,
        body: input.thesisNote,
      });
    }
  });

  return {
    transactionId,
    symbol: input.symbol,
    side: input.side,
  };
}

export async function deleteTransaction(transactionId: string) {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: transactions.id,
        portfolioId: transactions.portfolioId,
        securityId: transactions.securityId,
        side: transactions.side,
        symbol: securities.symbol,
      })
      .from(transactions)
      .innerJoin(securities, eq(transactions.securityId, securities.id))
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!target) {
      throw new Error("Transaction not found.");
    }

    await tx.delete(transactions).where(eq(transactions.id, transactionId));
    await recalculatePositionForSecurityTx(tx, target.portfolioId, target.securityId);

    return {
      symbol: target.symbol,
      side: target.side,
    };
  });
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const tradeDateValue = new Date(`${input.tradeDate}T00:00:00`);
  const executedAtValue = input.executedAt ? new Date(input.executedAt) : null;

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: transactions.id,
        portfolioId: transactions.portfolioId,
        securityId: transactions.securityId,
      })
      .from(transactions)
      .where(eq(transactions.id, input.transactionId))
      .limit(1);

    if (!target) {
      throw new Error("Transaction not found.");
    }

    await tx
      .update(transactions)
      .set({
        side: input.side,
        quantity: toNumeric(input.quantity, 8),
        unitPrice: toNumeric(input.unitPrice, 6),
        feeAmount: toNumeric(input.feeAmount, 6),
        taxAmount: toNumeric(input.taxAmount, 6),
        tradeDate: tradeDateValue,
        executedAt: executedAtValue,
      })
      .where(eq(transactions.id, input.transactionId));

    await recalculatePositionForSecurityTx(tx, target.portfolioId, target.securityId);

    return { side: input.side };
  });
}

