"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CURRENCIES,
  MARKETS,
  createTransaction,
  deleteTransaction,
  normalizeSymbol,
  type Currency,
  type Market,
  updateTransaction,
} from "@/features/transactions/server/transaction-service";

type TransactionActionState = {
  success: boolean;
  message: string;
  createdTransactionId?: string;
};

type ActionResult = {
  success: boolean;
  message: string;
};

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

    const result = await createTransaction({
      userId: session?.user?.id ?? null,
      side,
      market,
      symbol,
      securityName,
      currency,
      quantity,
      unitPrice,
      feeAmount,
      taxAmount,
      tradeDate,
      executedAt,
      memo,
      thesisNote,
    });

    revalidatePath("/");

    return {
      success: true,
      message: `Saved transaction (${result.symbol} ${result.side}).`,
      createdTransactionId: result.transactionId,
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

export async function deleteTransactionAction(transactionId: string): Promise<ActionResult> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before deleting transactions.",
      };
    }

    if (!transactionId) {
      return {
        success: false,
        message: "Transaction ID is required.",
      };
    }

    const result = await deleteTransaction(transactionId);

    revalidatePath("/");

    return {
      success: true,
      message: `Deleted transaction (${result.symbol} ${result.side}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete transaction.";
    return {
      success: false,
      message,
    };
  }
}

export async function updateTransactionAction(formData: FormData): Promise<ActionResult> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        success: false,
        message: "DATABASE_URL is required before updating transactions.",
      };
    }

    const transactionId = getString(formData, "transactionId");
    const sideRaw = getString(formData, "side");
    const side = sideRaw === "sell" ? "sell" : "buy";
    const quantity = getNumber(formData, "quantity");
    const unitPrice = getNumber(formData, "unitPrice");
    const feeAmount = getNumber(formData, "feeAmount", 0);
    const taxAmount = getNumber(formData, "taxAmount", 0);
    const tradeDate = getString(formData, "tradeDate");
    const executedAt = getString(formData, "executedAt");

    if (!transactionId) {
      return { success: false, message: "Transaction ID is required." };
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

    const result = await updateTransaction({
      transactionId,
      side,
      quantity,
      unitPrice,
      feeAmount,
      taxAmount,
      tradeDate,
      executedAt,
    });

    revalidatePath("/");

    return {
      success: true,
      message: `Updated transaction (${result.side}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update transaction.";
    return { success: false, message };
  }
}
