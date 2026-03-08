import { NextResponse } from "next/server";
import {
  getFinnhubGeneralNews,
  getFinnhubPortfolioNews,
} from "@/features/market-data/server/finnhub";

function formatDateToYmd(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode")?.trim() ?? "general").toLowerCase();
  const symbolsRaw = url.searchParams.get("symbols")?.trim() ?? "";
  const symbols = symbolsRaw
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);
  const from = formatDateToYmd(fromDate);
  const to = formatDateToYmd(today);

  try {
    if (mode === "portfolio") {
      if (symbols.length === 0) {
        return NextResponse.json({ ok: true, mode, symbols, items: [] });
      }

      const items = await getFinnhubPortfolioNews({
        symbols,
        from,
        to,
        perSymbolLimit: 6,
        totalLimit: 18,
      });
      return NextResponse.json({ ok: true, mode, symbols, items });
    }

    const items = await getFinnhubGeneralNews({
      category: "general",
      limit: 12,
    });
    return NextResponse.json({ ok: true, mode: "general", items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load news.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
