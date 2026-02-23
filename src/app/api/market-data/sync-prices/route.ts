import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { positions, priceSnapshots, securities } from "@/db/schema";
import { getFinnhubQuote } from "@/lib/market-data/finnhub";

const FINNHUB_SUPPORTED_MARKETS = new Set(["NASDAQ", "NYSE", "ETF"]);

function toNumeric(value: number, scale = 6) {
  return value.toFixed(scale);
}

function toDateOnly(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

async function runSync() {
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

  try {
    console.log("[SyncPrices] started");

    const rows = await db
      .select({
        securityId: positions.securityId,
        quantity: positions.quantity,
        symbol: securities.symbol,
        market: securities.market,
      })
      .from(positions)
      .innerJoin(securities, eq(positions.securityId, securities.id));

    const uniqueActive = new Map<
      string,
      { securityId: string; symbol: string; market: string }
    >();

    for (const row of rows) {
      if (Number(row.quantity) <= 0) continue;
      const key = `${row.securityId}:${row.symbol}:${row.market}`;
      if (!uniqueActive.has(key)) {
        uniqueActive.set(key, {
          securityId: row.securityId,
          symbol: row.symbol,
          market: row.market,
        });
      }
    }

    const targets = [...uniqueActive.values()];
    console.log("[SyncPrices] active targets", {
      count: targets.length,
      symbols: targets.map((t) => `${t.symbol}:${t.market}`),
    });

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No active positions found.",
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      });
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const target of targets) {
      if (!FINNHUB_SUPPORTED_MARKETS.has(target.market)) {
        skipped += 1;
        errors.push(
          `${target.symbol} (${target.market}): market not supported by current Finnhub sync.`,
        );
        console.warn("[SyncPrices] skipped unsupported market", target);
        continue;
      }

      try {
        console.log("[SyncPrices] fetching", {
          symbol: target.symbol,
          market: target.market,
        });
        const quote = await getFinnhubQuote(target.symbol);
        const tradingDay = toDateOnly(quote.asOf);

        await db
          .insert(priceSnapshots)
          .values({
            securityId: target.securityId,
            tradingDay,
            closePrice: toNumeric(quote.price, 6),
            source: "finnhub",
          })
          .onConflictDoUpdate({
            target: [priceSnapshots.securityId, priceSnapshots.tradingDay],
            set: {
              closePrice: toNumeric(quote.price, 6),
              source: "finnhub",
            },
          });

        updated += 1;
        console.log("[SyncPrices] upserted snapshot", {
          symbol: target.symbol,
          market: target.market,
          price: quote.price,
          tradingDay: tradingDay.toISOString(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown Finnhub error";
        errors.push(`${target.symbol} (${target.market}): ${message}`);
        console.error("[SyncPrices] fetch failed", {
          symbol: target.symbol,
          market: target.market,
          message,
        });
      }
    }

    console.log("[SyncPrices] completed", { updated, skipped, errorCount: errors.length });
    return NextResponse.json({
      ok: true,
      message: `Price sync completed. Updated ${updated} symbols.`,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST() {
  return runSync();
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

  return runSync();
}
