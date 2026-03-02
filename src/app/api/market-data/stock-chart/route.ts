import { NextResponse } from "next/server";
import {
  getStockChartData,
  type StockChartRange,
} from "@/features/market-data/server/stock-chart-service";

const VALID_RANGES = new Set<StockChartRange>(["1m", "3m", "6m", "1y"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim() ?? "";
  const market = url.searchParams.get("market")?.trim() ?? "";
  const range = (url.searchParams.get("range")?.trim() ?? "3m") as StockChartRange;

  if (!symbol || !market) {
    return NextResponse.json(
      { ok: false, message: "symbol and market are required." },
      { status: 400 },
    );
  }

  if (!VALID_RANGES.has(range)) {
    return NextResponse.json(
      { ok: false, message: "Invalid chart range." },
      { status: 400 },
    );
  }

  try {
    const data = await getStockChartData({ symbol, market, range });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load stock chart data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
