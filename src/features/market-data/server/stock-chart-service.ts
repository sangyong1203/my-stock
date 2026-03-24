export type StockChartRange = "6m" | "1y" | "2y" | "5y" | "10y" | "all";

export type StockChartPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StockChartData = {
  symbol: string;
  market: string;
  range: StockChartRange;
  points: StockChartPoint[];
  indicatorPoints: StockChartPoint[];
  latestClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
};

const RANGE_DAY_MAP: Record<StockChartRange, number> = {
  "6m": 180,
  "1y": 365,
  "2y": 365 * 2,
  "5y": 365 * 5,
  "10y": 365 * 10,
  all: Number.POSITIVE_INFINITY,
};
const INDICATOR_WARMUP_DAYS = 180;

const SUPPORTED_MARKETS = new Set(["NASDAQ", "NYSE", "ETF"]);

function toStooqSymbol(symbol: string, market: string) {
  if (!SUPPORTED_MARKETS.has(market.toUpperCase())) {
    throw new Error(`Market ${market} is not supported for this chart module yet.`);
  }

  return `${symbol.toLowerCase()}.us`;
}

function parseHistoryCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const points: StockChartPoint[] = [];
  for (const line of lines.slice(1)) {
    const [date, openString, highString, lowString, closeString, volumeString] =
      line.split(",");
    const open = Number(openString);
    const high = Number(highString);
    const low = Number(lowString);
    const close = Number(closeString);
    const volume = Number(volumeString);

    if (
      !date ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      !Number.isFinite(volume)
    ) {
      continue;
    }

    points.push({ date, open, high, low, close, volume });
  }

  return points;
}

async function fetchStooqHistory(symbol: string, market: string) {
  const stooqSymbol = toStooqSymbol(symbol, market);
  const url = new URL("https://stooq.com/q/d/l/");
  url.searchParams.set("s", stooqSymbol);
  url.searchParams.set("i", "d");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load chart data (${response.status}).`);
  }

  return parseHistoryCsv(await response.text());
}

export async function getLatestStockChartPoint(params: {
  symbol: string;
  market: string;
}) {
  const history = await fetchStooqHistory(
    params.symbol.trim().toUpperCase(),
    params.market.trim().toUpperCase(),
  );

  return history.at(-1) ?? null;
}

export async function getStockChartData(params: {
  symbol: string;
  market: string;
  range: StockChartRange;
}): Promise<StockChartData> {
  const symbol = params.symbol.trim().toUpperCase();
  const market = params.market.trim().toUpperCase();
  const range = params.range;

  if (!symbol) {
    throw new Error("Symbol is required.");
  }

  const history = await fetchStooqHistory(symbol, market);
  if (history.length < 2) {
    throw new Error(`Not enough chart history for ${symbol}.`);
  }

  const days = RANGE_DAY_MAP[range];
  const selectedPoints =
    days === Number.POSITIVE_INFINITY ? history : history.slice(-Math.min(history.length, days));
  const indicatorPoints =
    days === Number.POSITIVE_INFINITY
      ? history
      : history.slice(-Math.min(history.length, days + INDICATOR_WARMUP_DAYS));
  const latest = selectedPoints.at(-1) ?? history.at(-1);
  const previous = selectedPoints.at(0) ?? history.at(-2);
  const trailingYearPoints = history.slice(-Math.min(history.length, 365));

  if (!latest || !previous || previous.close <= 0) {
    throw new Error(`Unable to calculate chart change for ${symbol}.`);
  }

  const change = latest.close - previous.close;
  const fiftyTwoWeekHigh = Math.max(...trailingYearPoints.map((point) => point.high));
  const fiftyTwoWeekLow = Math.min(...trailingYearPoints.map((point) => point.low));

  return {
    symbol,
    market,
    range,
    points: selectedPoints,
    indicatorPoints,
    latestClose: latest.close,
    change,
    changePercent: (change / previous.close) * 100,
    dayHigh: latest.high,
    dayLow: latest.low,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
  };
}
