import { NextResponse } from "next/server";
import { getFinnhubSecurityLookup } from "@/features/market-data/server/finnhub";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim() ?? "";

  if (!symbol) {
    return NextResponse.json(
      { ok: false, message: "symbol is required." },
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
    const data = await getFinnhubSecurityLookup(symbol);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load security data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
