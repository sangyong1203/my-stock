import {
  bigint,
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const transactionSideEnum = pgEnum("transaction_side", ["buy", "sell"]);
export const portfolioCurrencyEnum = pgEnum("portfolio_currency", [
  "KRW",
  "USD",
]);
export const marketEnum = pgEnum("market", ["KRX", "NASDAQ", "NYSE", "ETF"]);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.credentialID] }),
  ],
);

export const portfolios = pgTable("portfolio", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: portfolioCurrencyEnum("currency").notNull().default("KRW"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const securities = pgTable(
  "security",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    symbol: text("symbol").notNull(),
    market: marketEnum("market").notNull(),
    name: text("name").notNull(),
    currency: portfolioCurrencyEnum("currency").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("security_symbol_market_idx").on(table.symbol, table.market)],
);

export const transactions = pgTable("transaction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  securityId: text("securityId")
    .notNull()
    .references(() => securities.id, { onDelete: "restrict" }),
  side: transactionSideEnum("side").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  unitPrice: numeric("unitPrice", { precision: 20, scale: 6 }).notNull(),
  feeAmount: numeric("feeAmount", { precision: 20, scale: 6 })
    .notNull()
    .default("0"),
  taxAmount: numeric("taxAmount", { precision: 20, scale: 6 })
    .notNull()
    .default("0"),
  tradeDate: timestamp("tradeDate", { mode: "date" }).notNull(),
  executedAt: timestamp("executedAt", { mode: "date" }),
  memo: text("memo"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const positions = pgTable(
  "position",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    portfolioId: text("portfolioId")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    securityId: text("securityId")
      .notNull()
      .references(() => securities.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 20, scale: 8 })
      .notNull()
      .default("0"),
    avgCostPerShare: numeric("avgCostPerShare", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    totalCostBasis: numeric("totalCostBasis", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    realizedPnl: numeric("realizedPnl", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    lastCalculatedAt: timestamp("lastCalculatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("position_portfolio_security_idx").on(
      table.portfolioId,
      table.securityId,
    ),
  ],
);

export const priceSnapshots = pgTable(
  "price_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    securityId: text("securityId")
      .notNull()
      .references(() => securities.id, { onDelete: "cascade" }),
    tradingDay: timestamp("tradingDay", { mode: "date" }).notNull(),
    closePrice: numeric("closePrice", { precision: 20, scale: 6 }).notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("price_snapshot_security_day_idx").on(table.securityId, table.tradingDay)],
);

export const securityNotes = pgTable("security_note", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  portfolioId: text("portfolioId")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  securityId: text("securityId")
    .notNull()
    .references(() => securities.id, { onDelete: "cascade" }),
  title: text("title"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const transactionNotes = pgTable("transaction_note", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  transactionId: text("transactionId")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioMetricsDaily = pgTable(
  "portfolio_metrics_daily",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    portfolioId: text("portfolioId")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    tradingDay: timestamp("tradingDay", { mode: "date" }).notNull(),
    marketValue: numeric("marketValue", { precision: 20, scale: 6 }).notNull(),
    costBasis: numeric("costBasis", { precision: 20, scale: 6 }).notNull(),
    unrealizedPnl: numeric("unrealizedPnl", { precision: 20, scale: 6 }).notNull(),
    realizedPnlCumulative: numeric("realizedPnlCumulative", {
      precision: 20,
      scale: 6,
    }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("portfolio_metrics_daily_idx").on(table.portfolioId, table.tradingDay)],
);
