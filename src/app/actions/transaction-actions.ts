"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
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
import { authOptions } from "@/lib/auth";
import { EMPTY_POSITION, applyAverageCostTrade } from "@/lib/portfolio/average-cost";

type TransactionActionState = {
  success: boolean;
  message: string;
  createdTransactionId?: string;
};

const DEMO_USER_ID = "demo-user";
const DEMO_PORTFOLIO_ID = "demo-portfolio";
const MARKETS = ["KRX", "NASDAQ", "NYSE", "ETF"] as const;
const CURRENCIES = ["KRW", "USD"] as const;
type Market = (typeof MARKETS)[number];
type Currency = (typeof CURRENCIES)[number];

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const raw = getString(formData, key);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number`);
  }
  return value;
}

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/\s+/g, "");
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

  if (existing) return existing;

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

export async function createTransactionAction(
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before saving transactions.",
      };
    }

    const session = await getServerSession(authOptions);
    const sideRaw = getString(formData, "side");
    const side = sideRaw === "sell" ? "sell" : "buy";
    const marketInput = (getString(formData, "market") || "NASDAQ").toUpperCase();
    const symbol = normalizeSymbol(getString(formData, "symbol"));
    const securityName = getString(formData, "securityName") || symbol;
    const currencyInput = (getString(formData, "currency") || "USD").toUpperCase();
    const market: Market = MARKETS.includes(marketInput as Market)
      ? (marketInput as Market)
      : "NASDAQ";
    const currency: Currency = CURRENCIES.includes(currencyInput as Currency)
      ? (currencyInput as Currency)
      : "USD";
    const quantity = getNumber(formData, "quantity");
    const unitPrice = getNumber(formData, "unitPrice");
    const feeAmount = getNumber(formData, "feeAmount", 0);
    const taxAmount = getNumber(formData, "taxAmount", 0);
    const tradeDate = getString(formData, "tradeDate");
    const executedAt = getString(formData, "executedAt");
    const memo = getString(formData, "memo");
    const thesisNote = getString(formData, "thesisNote");

    if (!symbol) {
      return { success: false, message: "Symbol is required." };
    }
    if (quantity <= 0) {
      return { success: false, message: "Quantity must be greater than 0." };
    }
    if (unitPrice < 0) {
      return { success: false, message: "Unit price must be 0 or greater." };
    }
    if (!tradeDate) {
      return { success: false, message: "Trade date is required." };
    }

    const userId = session?.user?.id ?? (await ensureDemoUser()).id;
    const portfolio = await ensurePortfolio(userId, currency);

    const [existingSecurity] = await db
      .select()
      .from(securities)
      .where(and(eq(securities.symbol, symbol), eq(securities.market, market)))
      .limit(1);

    let securityId = existingSecurity?.id;

    if (!securityId) {
      securityId = randomUUID();
      await db.insert(securities).values({
        id: securityId,
        symbol,
        market,
        name: securityName,
        currency,
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
      side,
      quantity,
      unitPrice,
      feeAmount,
      taxAmount,
    });

    const transactionId = randomUUID();
    const tradeDateValue = new Date(`${tradeDate}T00:00:00`);
    const executedAtValue = executedAt ? new Date(executedAt) : null;

    await db.transaction(async (tx) => {
      await tx.insert(transactions).values({
        id: transactionId,
        portfolioId: portfolio.id,
        securityId,
        side,
        quantity: toNumeric(quantity, 8),
        unitPrice: toNumeric(unitPrice, 6),
        feeAmount: toNumeric(feeAmount, 6),
        taxAmount: toNumeric(taxAmount, 6),
        tradeDate: tradeDateValue,
        executedAt: executedAtValue,
        memo: memo || null,
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

      if (memo) {
        await tx.insert(transactionNotes).values({
          id: randomUUID(),
          transactionId,
          body: memo,
        });
      }

      if (thesisNote) {
        await tx.insert(securityNotes).values({
          id: randomUUID(),
          portfolioId: portfolio.id,
          securityId,
          title: `${symbol} thesis note`,
          body: thesisNote,
        });
      }
    });

    revalidatePath("/");

    return {
      success: true,
      message: `Saved transaction (${symbol} ${side}).`,
      createdTransactionId: transactionId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save transaction.";
    return {
      success: false,
      message,
    };
  }
}
