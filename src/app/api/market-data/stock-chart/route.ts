import { NextResponse } from "next/server";
import {
  getStockChartData,
  type StockChartInterval,
  type StockChartRange,
} from "@/features/market-data/server/stock-chart-service";

const VALID_RANGES = new Set<StockChartRange>(["6m", "1y", "2y", "5y", "10y", "all"]);
const VALID_INTERVALS = new Set<StockChartInterval>(["day", "week", "month"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim() ?? "";
  const market = url.searchParams.get("market")?.trim() ?? "";
  const range = (url.searchParams.get("range")?.trim() ?? "1y") as StockChartRange;
  const interval = (url.searchParams.get("interval")?.trim() ?? "day") as StockChartInterval;

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

  if (!VALID_INTERVALS.has(interval)) {
    return NextResponse.json(
      { ok: false, message: "Invalid chart interval." },
      { status: 400 },
    );
  }

  try {
    const data = await getStockChartData({ symbol, market, range, interval });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load stock chart data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
