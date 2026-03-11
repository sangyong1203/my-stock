"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CURRENCIES,
  MARKETS,
  type Currency,
  type Market,
} from "@/features/transactions/server/transaction-service";
import {
  createWatchlistItem,
  deleteWatchlistItem,
} from "@/features/watchlist/server/watchlist-service";

type WatchlistActionState = {
  success: boolean;
  message: string;
  itemId?: string;
};

type ActionResult = {
  success: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createWatchlistItemAction(
  _prevState: WatchlistActionState,
  formData: FormData,
): Promise<WatchlistActionState> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before saving watch list items.",
      };
    }

    const session = await getServerSession(authOptions);
    const marketInput = getString(formData, "market").toUpperCase();
    const currencyInput = getString(formData, "currency").toUpperCase();
    const symbol = getString(formData, "symbol");
    const securityName = getString(formData, "securityName");
    const note = getString(formData, "note");
    const market: Market = MARKETS.includes(marketInput as Market)
      ? (marketInput as Market)
      : "NASDAQ";
    const currency: Currency = CURRENCIES.includes(currencyInput as Currency)
      ? (currencyInput as Currency)
      : "USD";

    if (!symbol) {
      return { success: false, message: "Symbol is required." };
    }

    const result = await createWatchlistItem({
      userId: session?.user?.id ?? null,
      symbol,
      securityName: securityName || symbol,
      market,
      currency,
      note,
    });

    revalidatePath("/");

    return {
      success: true,
      message:
        result.action === "created"
          ? `Added ${result.symbol} to watch list.`
          : `Updated watch list note for ${result.symbol}.`,
      itemId: result.id,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save watch list item.",
    };
  }
}

export async function deleteWatchlistItemAction(
  watchlistItemId: string,
): Promise<ActionResult> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before deleting watch list items.",
      };
    }

    if (!watchlistItemId) {
      return {
        success: false,
        message: "Watch list item ID is required.",
      };
    }

    const result = await deleteWatchlistItem(watchlistItemId);
    revalidatePath("/");

    return {
      success: true,
      message: `Removed ${result.symbol} from watch list.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete watch list item.",
    };
  }
}
