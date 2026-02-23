"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { priceSnapshots, securities } from "@/db/schema";

type PriceSnapshotActionState = {
  success: boolean;
  message: string;
};

const MARKETS = ["KRX", "NASDAQ", "NYSE", "ETF"] as const;
type Market = (typeof MARKETS)[number];

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number`);
  }
  return value;
}

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

export async function upsertPriceSnapshotAction(
  _prevState: PriceSnapshotActionState,
  formData: FormData,
): Promise<PriceSnapshotActionState> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before saving prices.",
      };
    }

    const symbol = getString(formData, "symbol").toUpperCase();
    const marketInput = getString(formData, "market").toUpperCase();
    const tradingDay = getString(formData, "tradingDay");
    const closePrice = getNumber(formData, "closePrice");

    const market: Market = MARKETS.includes(marketInput as Market)
      ? (marketInput as Market)
      : "NASDAQ";

    if (!symbol) {
      return { success: false, message: "Symbol is required." };
    }
    if (!tradingDay) {
      return { success: false, message: "Trading day is required." };
    }
    if (closePrice < 0) {
      return { success: false, message: "Close price must be 0 or greater." };
    }

    const [security] = await db
      .select({ id: securities.id })
      .from(securities)
      .where(and(eq(securities.symbol, symbol), eq(securities.market, market)))
      .limit(1);

    if (!security) {
      return {
        success: false,
        message: `Security not found: ${symbol} (${market}). Add a trade first.`,
      };
    }

    const tradingDayValue = new Date(`${tradingDay}T00:00:00`);

    await db
      .insert(priceSnapshots)
      .values({
        securityId: security.id,
        tradingDay: tradingDayValue,
        closePrice: toNumeric(closePrice, 6),
        source: "manual",
      })
      .onConflictDoUpdate({
        target: [priceSnapshots.securityId, priceSnapshots.tradingDay],
        set: {
          closePrice: toNumeric(closePrice, 6),
          source: "manual",
        },
      });

    revalidatePath("/");

    return {
      success: true,
      message: `Saved close price for ${symbol} (${market}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save price snapshot.";
    return { success: false, message };
  }
}
