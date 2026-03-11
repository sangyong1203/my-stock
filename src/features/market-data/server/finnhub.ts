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

type FinnhubCompanyNewsResponse = {
  id: number;
  category: string;
  datetime: number; // unix timestamp (seconds)
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  previousClose: number | null;
  changeAmount: number | null;
  changePercent: number | null;
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

export type CompanyNewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  url: string;
  imageUrl: string | null;
  publishedAt: Date;
  symbol?: string;
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
    previousClose: Number.isFinite(data.pc) && data.pc > 0 ? data.pc : null,
    changeAmount:
      Number.isFinite(data.pc) && data.pc > 0 ? data.c - data.pc : null,
    changePercent:
      Number.isFinite(data.pc) && data.pc > 0 ? ((data.c - data.pc) / data.pc) * 100 : null,
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

export async function getFinnhubCompanyNews(params: {
  symbol: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  limit?: number;
}): Promise<CompanyNewsItem[]> {
  const apiKey = getApiKey();
  const symbol = params.symbol.trim().toUpperCase();

  const url = new URL("https://finnhub.io/api/v1/company-news");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
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
    console.error("[Finnhub] company-news request failed", {
      symbol,
      status: response.status,
      body: bodyText.slice(0, 300),
    });
    throw new Error(`Finnhub company-news request failed (${response.status})`);
  }

  const data = (await response.json()) as FinnhubCompanyNewsResponse[];
  const limit = params.limit ?? 12;

  return data
    .filter((item) => item.id && item.headline && item.url)
    .slice(0, limit)
    .map((item) => ({
      id: String(item.id),
      headline: item.headline,
      summary: item.summary ?? "",
      source: item.source ?? "Unknown",
      category: item.category ?? "",
      url: item.url,
      imageUrl: item.image || null,
      publishedAt: new Date(item.datetime * 1000),
      symbol,
    }));
}

export async function getFinnhubGeneralNews(params: {
  category?: "general" | "forex" | "crypto" | "merger";
  limit?: number;
}): Promise<CompanyNewsItem[]> {
  const apiKey = getApiKey();
  const category = params.category ?? "general";

  const url = new URL("https://finnhub.io/api/v1/news");
  url.searchParams.set("category", category);
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
    console.error("[Finnhub] general-news request failed", {
      category,
      status: response.status,
      body: bodyText.slice(0, 300),
    });
    throw new Error(`Finnhub general-news request failed (${response.status})`);
  }

  const data = (await response.json()) as FinnhubCompanyNewsResponse[];
  const limit = params.limit ?? 12;

  return data
    .filter((item) => item.id && item.headline && item.url)
    .slice(0, limit)
    .map((item) => ({
      id: String(item.id),
      headline: item.headline,
      summary: item.summary ?? "",
      source: item.source ?? "Unknown",
      category: item.category ?? category,
      url: item.url,
      imageUrl: item.image || null,
      publishedAt: new Date(item.datetime * 1000),
    }));
}

export async function getFinnhubPortfolioNews(params: {
  symbols: string[];
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  perSymbolLimit?: number;
  totalLimit?: number;
}): Promise<CompanyNewsItem[]> {
  const symbols = Array.from(
    new Set(
      params.symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 10);

  if (symbols.length === 0) {
    return [];
  }

  const perSymbolLimit = params.perSymbolLimit ?? 6;
  const totalLimit = params.totalLimit ?? 18;

  const newsBySymbol = await Promise.all(
    symbols.map((symbol) =>
      getFinnhubCompanyNews({
        symbol,
        from: params.from,
        to: params.to,
        limit: perSymbolLimit,
      }).catch(() => []),
    ),
  );

  const merged = newsBySymbol.flat();
  const dedupByUrl = new Map<string, CompanyNewsItem>();

  for (const item of merged) {
    if (!dedupByUrl.has(item.url)) {
      dedupByUrl.set(item.url, item);
    }
  }

  return [...dedupByUrl.values()]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, totalLimit);
}
