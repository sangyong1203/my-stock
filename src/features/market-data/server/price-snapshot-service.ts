import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { priceSnapshots, securities } from "@/db/schema";

export const MARKETS = ["KRX", "NASDAQ", "NYSE", "ETF"] as const;
export type Market = (typeof MARKETS)[number];

export type UpsertPriceSnapshotInput = {
  symbol: string;
  market: Market;
  tradingDay: string;
  closePrice: number;
};

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

export async function upsertPriceSnapshot(input: UpsertPriceSnapshotInput) {
  const [security] = await db
    .select({ id: securities.id })
    .from(securities)
    .where(and(eq(securities.symbol, input.symbol), eq(securities.market, input.market)))
    .limit(1);

  if (!security) {
    throw new Error(
      `Security not found: ${input.symbol} (${input.market}). Add a trade first.`,
    );
  }

  const tradingDayValue = new Date(`${input.tradingDay}T00:00:00`);

  await db
    .insert(priceSnapshots)
    .values({
      securityId: security.id,
      tradingDay: tradingDayValue,
      closePrice: toNumeric(input.closePrice, 6),
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [priceSnapshots.securityId, priceSnapshots.tradingDay],
      set: {
        closePrice: toNumeric(input.closePrice, 6),
        source: "manual",
      },
    });

  return {
    symbol: input.symbol,
    market: input.market,
  };
}
