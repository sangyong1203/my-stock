"use client";

import { Moon, Sun } from "lucide-react";
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
import { formatCurrency, formatDate, formatDateTime } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { DeleteTransactionButton } from "@/features/transactions/components/delete-transaction-button";
import { EditTransactionDialog } from "@/features/transactions/components/edit-transaction-dialog";

export function OpenPositionsModule({ model }: DashboardModuleProps) {
  const positions = model.dashboard.positions;

  return (
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
                <TableHead className="text-right">Unrealized P/L</TableHead>
                <TableHead className="text-right">P/L %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No positions yet. Add your first trade.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((row) => {
                  const pnlRate =
                    row.avgCost === 0
                      ? 0
                      : ((row.currentPrice - row.avgCost) / row.avgCost) * 100;
                  const unrealizedPnl =
                    row.quantity * (row.currentPrice - row.avgCost);
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
                      <TableCell className="text-right">{row.quantity}</TableCell>
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
                        className={`text-right font-medium ${
                          unrealizedPnl >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {formatCurrency(unrealizedPnl, row.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          positive ? "text-emerald-500" : "text-rose-500"
                        }`}
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
  );
}

export function RecentTransactionsModule({ model }: DashboardModuleProps) {
  const transactions = model.dashboard.recentTransactions;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Stored in `transaction` and reflected into `position` via server action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-border/70 bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
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
                <div className="flex items-center gap-1">
                  <EditTransactionDialog transaction={tx} />
                  <DeleteTransactionButton
                    transactionId={tx.id}
                    symbol={tx.symbol}
                  />
                </div>
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
                  Executed At: {tx.executedAt ? formatDateTime(tx.executedAt) : "-"}
                </span>
                {tx.side === "sell" && tx.realizedPnlDelta !== null ? (
                  <span
                    className={`col-span-2 font-medium ${
                      tx.realizedPnlDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    Realized P/L: {formatCurrency(tx.realizedPnlDelta)}{" "}
                    {tx.realizedReturnRate !== null
                      ? `(${tx.realizedReturnRate.toFixed(2)}%)`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function NextBuildStepsModule() {
  return (
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
  );
}
