import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getActiveTargetsForAllPortfolios,
  getActiveTargetsForPortfolio,
  getPortfolioIdForUser,
  syncPricesForTargets,
} from "@/features/market-data/server/sync-prices-service";

function validateSyncEnvironment() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL is not configured." },
      { status: 400 },
    );
  }

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { ok: false, message: "FINNHUB_API_KEY is not configured." },
      { status: 400 },
    );
  }

  return null;
}

export async function POST() {
  const environmentError = validateSyncEnvironment();
  if (environmentError) {
    return environmentError;
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "Sign in is required for portfolio price sync." },
      { status: 401 },
    );
  }

  const portfolioId = await getPortfolioIdForUser(userId);
  if (!portfolioId) {
    return NextResponse.json(
      { ok: false, message: "No portfolio found for this user." },
      { status: 404 },
    );
  }

  console.log("[SyncPrices] started for portfolio", { userId, portfolioId });
  const targets = await getActiveTargetsForPortfolio(portfolioId);
  const result = await syncPricesForTargets(targets);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const expected = `Bearer ${cronSecret}`;
    if (authHeader !== expected) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized cron request." },
        { status: 401 },
      );
    }
  }

  const environmentError = validateSyncEnvironment();
  if (environmentError) {
    return environmentError;
  }

  try {
    console.log("[SyncPrices] started");
    const targets = await getActiveTargetsForAllPortfolios();
    const result = await syncPricesForTargets(targets);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

