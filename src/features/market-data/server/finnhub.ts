type FinnhubQuoteResponse = {
  c: number; // current price
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number; // unix timestamp (seconds)
  error?: string;
};

type FinnhubCompanyProfileResponse = {
  ticker?: string;
  name?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  asOf: Date;
  source: "finnhub";
};

export type SecurityLookupResult = {
  symbol: string;
  securityName: string;
  market: "KRX" | "NASDAQ" | "NYSE" | "ETF";
  currency: "KRW" | "USD";
  unitPrice: number;
};

function getApiKey() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set");
  }
  return apiKey;
}

function mapExchangeToMarket(exchange?: string) {
  const normalized = exchange?.trim().toUpperCase() ?? "";
  if (normalized.includes("NASDAQ")) return "NASDAQ";
  if (normalized.includes("NEW YORK STOCK EXCHANGE")) return "NYSE";
  if (normalized === "NYSE") return "NYSE";
  if (normalized.includes("ETF")) return "ETF";
  return "NASDAQ";
}

function mapCurrencyToCurrencyCode(currency?: string) {
  return currency?.trim().toUpperCase() === "KRW" ? "KRW" : "USD";
}

export async function getFinnhubQuote(symbol: string): Promise<MarketQuote> {
  const apiKey = getApiKey();

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

export async function getFinnhubSecurityLookup(
  symbol: string,
): Promise<SecurityLookupResult> {
  const apiKey = getApiKey();
  const normalizedSymbol = symbol.trim().toUpperCase();
  const quoteUrl = new URL("https://finnhub.io/api/v1/quote");
  quoteUrl.searchParams.set("symbol", normalizedSymbol);
  quoteUrl.searchParams.set("token", apiKey);

  const profileUrl = new URL("https://finnhub.io/api/v1/stock/profile2");
  profileUrl.searchParams.set("symbol", normalizedSymbol);
  profileUrl.searchParams.set("token", apiKey);

  const [quoteResponse, profileResponse] = await Promise.all([
    fetch(quoteUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }),
    fetch(profileUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }),
  ]);

  if (!quoteResponse.ok) {
    throw new Error(`Finnhub quote request failed (${quoteResponse.status})`);
  }

  if (!profileResponse.ok) {
    throw new Error(`Finnhub profile request failed (${profileResponse.status})`);
  }

  const quoteData = (await quoteResponse.json()) as FinnhubQuoteResponse;
  const profileData = (await profileResponse.json()) as FinnhubCompanyProfileResponse;

  if (!Number.isFinite(quoteData.c) || quoteData.c <= 0) {
    throw new Error(`Invalid quote for ${normalizedSymbol}`);
  }

  return {
    symbol: normalizedSymbol,
    securityName: profileData.name?.trim() || normalizedSymbol,
    market: mapExchangeToMarket(profileData.exchange),
    currency: mapCurrencyToCurrencyCode(profileData.currency),
    unitPrice: quoteData.c,
  };
}
