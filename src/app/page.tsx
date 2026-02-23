import { Moon, Sun, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { SyncMarketPricesButton } from "@/components/prices/sync-market-prices-button";
import { UpsertPriceSnapshotDialog } from "@/components/prices/upsert-price-snapshot-dialog";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";

export const dynamic = "force-dynamic";

function formatCurrency(value: number, currency: "KRW" | "USD" = "USD") {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function Home() {
  const dashboard = await getDashboardData();
  const positions = dashboard.positions;

  const summaries = (() => {
    const marketValue = positions.reduce(
      (sum, item) => sum + item.quantity * item.currentPrice,
      0,
    );
    const invested = positions.reduce(
      (sum, item) => sum + item.quantity * item.avgCost,
      0,
    );
    const unrealizedPnl = marketValue - invested;
    const returnRate = invested === 0 ? 0 : (unrealizedPnl / invested) * 100;
    return { marketValue, invested, unrealizedPnl, returnRate };
  })();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 text-zinc-50 shadow-sm">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.25),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_40%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/10 text-white hover:bg-white/10">
                  myStock MVP
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/5 text-zinc-100"
                >
                  {dashboard.source === "database" ? "DB Mode" : "Demo Mode"}
                </Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Investment Dashboard
                </h1>
                <p className="mt-1 text-sm text-zinc-300">
                  Average-cost accounting + transaction journal + notes
                </p>
              </div>
              {dashboard.warning ? (
                <p className="max-w-2xl rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  {dashboard.warning}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SyncMarketPricesButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" />
              <UpsertPriceSnapshotDialog triggerClassName="border-white/20 bg-white/5 text-white hover:bg-white/10" />
              <CreateTransactionDialog triggerClassName="bg-white/10 text-white hover:bg-white/20" />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Total Market Value</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Wallet className="size-5 text-emerald-500" />
                {formatCurrency(summaries.marketValue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Total Cost Basis</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(summaries.invested)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Unrealized P/L</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {summaries.unrealizedPnl >= 0 ? (
                  <TrendingUp className="size-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-5 text-rose-500" />
                )}
                <span
                  className={
                    summaries.unrealizedPnl >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }
                >
                  {formatCurrency(summaries.unrealizedPnl)}
                </span>
              </CardTitle>
              <CardDescription
                className={
                  summaries.returnRate >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
              >
                {summaries.returnRate.toFixed(2)}%
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Realized P/L</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {dashboard.realizedPnl >= 0 ? (
                  <TrendingUp className="size-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-5 text-rose-500" />
                )}
                <span
                  className={
                    dashboard.realizedPnl >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }
                >
                  {formatCurrency(dashboard.realizedPnl)}
                </span>
              </CardTitle>
              <CardDescription
                className={
                  dashboard.realizedReturnRate >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
              >
                {dashboard.realizedReturnRate.toFixed(2)}%
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="min-w-0 border-border/70">
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                Unrealized P/L uses `currentPrice - averageCost` on current quantity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">P/L %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No positions yet. Add your first trade.
                        </TableCell>
                      </TableRow>
                    ) : (
                      positions.map((row) => {
                        const pnlRate =
                          row.avgCost === 0
                            ? 0
                            : ((row.currentPrice - row.avgCost) / row.avgCost) * 100;
                        const positionValue = row.quantity * row.currentPrice;
                        const positive = pnlRate >= 0;

                        return (
                          <TableRow key={`${row.market}:${row.symbol}`}>
                            <TableCell>
                              <div className="font-medium">{row.symbol}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.name} · {row.market}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(row.avgCost, row.currency)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(row.currentPrice, row.currency)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(positionValue, row.currency)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${positive ? "text-emerald-500" : "text-rose-500"}`}
                            >
                              {pnlRate.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid w-full gap-4 lg:w-[380px]">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Stored in `transaction` and reflected into `position` via server action.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.recentTransactions.length === 0 ? (
                  <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
                    No transactions yet.
                  </div>
                ) : (
                  dashboard.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{tx.symbol}</div>
                        <Badge
                          variant="outline"
                          className={
                            tx.side === "buy"
                              ? "border-emerald-500/40 text-emerald-500"
                              : "border-rose-500/40 text-rose-500"
                          }
                        >
                          {tx.side.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Qty: {tx.quantity}</span>
                        <span>Price: {formatCurrency(tx.unitPrice)}</span>
                        <span>Fee: {formatCurrency(tx.feeAmount)}</span>
                        <span>Tax: {formatCurrency(tx.taxAmount)}</span>
                        <span className="col-span-2">
                          Trade Date: {formatDate(tx.tradeDate)}
                        </span>
                        <span className="col-span-2">
                          Executed At:{" "}
                          {tx.executedAt ? formatDateTime(tx.executedAt) : "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Next Build Steps</CardTitle>
                <CardDescription>Recommended sequence for production readiness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="font-medium">1. Connect Neon + migrate schema</p>
                  <p className="mt-1 text-muted-foreground">
                    Run `db:generate` and `db:migrate` after setting `DATABASE_URL`.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="font-medium">2. Add price snapshot sync job</p>
                  <p className="mt-1 text-muted-foreground">
                    Save daily close prices to calculate portfolio performance over time.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <p className="font-medium">3. Require auth for live portfolios</p>
                  <p className="mt-1 text-muted-foreground">
                    Keep demo mode, but route real user data through Auth.js sessions.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3 text-muted-foreground">
                  <Moon className="size-4 dark:hidden" />
                  <Sun className="hidden size-4 dark:block" />
                  Dark mode is enabled by default
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}



