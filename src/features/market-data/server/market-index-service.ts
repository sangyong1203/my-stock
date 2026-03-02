type MarketIndexDefinition = {
  id: string;
  label: string;
  stooqSymbol: string;
};

export type MarketIndexSnapshot = {
  id: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  asOf: Date | null;
};

const MARKET_INDEX_DEFINITIONS: MarketIndexDefinition[] = [
  { id: "nasdaq", label: "NASDAQ", stooqSymbol: "^ndq" },
  { id: "sp500", label: "S&P 500", stooqSymbol: "^spx" },
];

const FALLBACK_MARKET_INDEXES: MarketIndexSnapshot[] = [
  {
    id: "nasdaq",
    label: "NASDAQ",
    value: 22668.21,
    change: -210.17,
    changePercent: -0.91,
    sparkline: [22580, 22530, 22590, 22640, 22610, 22668],
    asOf: null,
  },
  {
    id: "sp500",
    label: "S&P 500",
    value: 6878.88,
    change: -29.98,
    changePercent: -0.43,
    sparkline: [6892, 6884, 6870, 6886, 6864, 6878.88],
    asOf: null,
  },
];

type StooqHistoryRow = {
  date: Date;
  close: number;
};

function parseStooqHistory(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: StooqHistoryRow[] = [];
  for (const line of lines.slice(1)) {
    const [dateString, , , , closeString] = line.split(",");
    const close = Number(closeString);
    const date = new Date(`${dateString}T00:00:00Z`);

    if (!Number.isFinite(close) || Number.isNaN(date.getTime())) {
      continue;
    }

    rows.push({ date, close });
  }

  return rows;
}

async function getMarketIndexHistory(stooqSymbol: string) {
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
    throw new Error(`Stooq request failed (${response.status})`);
  }

  return parseStooqHistory(await response.text());
}

async function loadMarketIndex(definition: MarketIndexDefinition) {
  const rows = await getMarketIndexHistory(definition.stooqSymbol);
  const recentRows = rows.slice(-20);
  const current = recentRows.at(-1);
  const previous = recentRows.at(-2);

  if (!current || !previous || previous.close <= 0) {
    throw new Error(`Not enough history for ${definition.label}`);
  }

  const change = current.close - previous.close;
  return {
    id: definition.id,
    label: definition.label,
    value: current.close,
    change,
    changePercent: (change / previous.close) * 100,
    sparkline: recentRows.map((row) => row.close),
    asOf: current.date,
  } satisfies MarketIndexSnapshot;
}

export async function getMarketIndexSnapshots(): Promise<MarketIndexSnapshot[]> {
  const results = await Promise.allSettled(
    MARKET_INDEX_DEFINITIONS.map((definition) => loadMarketIndex(definition)),
  );

  return results.map((result, index) =>
    result.status === "fulfilled" ? result.value : FALLBACK_MARKET_INDEXES[index],
  );
}
