type FinnhubQuoteResponse = {
  c: number; // current price
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number; // unix timestamp (seconds)
  error?: string;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  asOf: Date;
  source: "finnhub";
};

export async function getFinnhubQuote(symbol: string): Promise<MarketQuote> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set");
  }

  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    console.error("[Finnhub] quote request failed", {
      symbol,
      status: response.status,
      body: bodyText.slice(0, 300),
    });
    throw new Error(`Finnhub request failed (${response.status})`);
  }

  const data = (await response.json()) as FinnhubQuoteResponse;

  console.log("[Finnhub] quote success", {
    symbol,
    price: data.c,
    timestamp: data.t,
  });

  if (data.error) {
    throw new Error(`Finnhub error: ${data.error}`);
  }

  if (!Number.isFinite(data.c) || data.c <= 0) {
    throw new Error(`Invalid quote for ${symbol}`);
  }

  const timestampMs =
    Number.isFinite(data.t) && data.t > 0 ? data.t * 1000 : Date.now();

  return {
    symbol,
    price: data.c,
    asOf: new Date(timestampMs),
    source: "finnhub",
  };
}
