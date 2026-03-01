"use server";

import { revalidatePath } from "next/cache";
import {
  MARKETS,
  type Market,
  upsertPriceSnapshot,
} from "@/features/market-data/server/price-snapshot-service";

type PriceSnapshotActionState = {
  success: boolean;
  message: string;
};

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

    const result = await upsertPriceSnapshot({
      symbol,
      market,
      tradingDay,
      closePrice,
    });

    revalidatePath("/");

    return {
      success: true,
      message: `Saved close price for ${result.symbol} (${result.market}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save price snapshot.";
    return { success: false, message };
  }
}
