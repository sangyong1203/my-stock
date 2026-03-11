import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, securities, users, watchlistItems } from "@/db/schema";
import {
  CURRENCIES,
  MARKETS,
  normalizeSymbol,
  type Currency,
  type Market,
} from "@/features/transactions/server/transaction-service";

const DEMO_USER_ID = "demo-user";
const DEMO_PORTFOLIO_ID = "demo-portfolio";

export type CreateWatchlistItemInput = {
  userId: string | null;
  symbol: string;
  securityName: string;
  market: Market;
  currency: Currency;
  note: string;
};

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
    throw new Error("Failed to create demo user.");
  }

  return created;
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
    throw new Error("Failed to create portfolio.");
  }

  return created;
}

export async function createWatchlistItem(input: CreateWatchlistItemInput) {
  const userId = input.userId ?? (await ensureDemoUser()).id;
  const portfolio = await ensurePortfolio(userId, input.currency);
  const symbol = normalizeSymbol(input.symbol);

  if (!symbol) {
    throw new Error("Symbol is required.");
  }

  const market: Market = MARKETS.includes(input.market) ? input.market : "NASDAQ";
  const currency: Currency = CURRENCIES.includes(input.currency)
    ? input.currency
    : "USD";

  const [existingSecurity] = await db
    .select()
    .from(securities)
    .where(and(eq(securities.symbol, symbol), eq(securities.market, market)))
    .limit(1);

  const securityId = existingSecurity?.id ?? randomUUID();

  if (!existingSecurity) {
    await db.insert(securities).values({
      id: securityId,
      symbol,
      market,
      name: input.securityName || symbol,
      currency,
    });
  }

  const [existingItem] = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.portfolioId, portfolio.id),
        eq(watchlistItems.securityId, securityId),
      ),
    )
    .limit(1);

  if (existingItem) {
    await db
      .update(watchlistItems)
      .set({
        note: input.note || null,
        updatedAt: new Date(),
      })
      .where(eq(watchlistItems.id, existingItem.id));

    return {
      id: existingItem.id,
      symbol,
      action: "updated" as const,
    };
  }

  const watchlistId = randomUUID();
  await db.insert(watchlistItems).values({
    id: watchlistId,
    portfolioId: portfolio.id,
    securityId,
    note: input.note || null,
  });

  return {
    id: watchlistId,
    symbol,
    action: "created" as const,
  };
}

export async function deleteWatchlistItem(watchlistItemId: string) {
  const [existing] = await db
    .select({
      id: watchlistItems.id,
      symbol: securities.symbol,
    })
    .from(watchlistItems)
    .innerJoin(securities, eq(watchlistItems.securityId, securities.id))
    .where(eq(watchlistItems.id, watchlistItemId))
    .limit(1);

  if (!existing) {
    throw new Error("Watch list item not found.");
  }

  await db.delete(watchlistItems).where(eq(watchlistItems.id, watchlistItemId));

  return {
    id: existing.id,
    symbol: existing.symbol,
  };
}
