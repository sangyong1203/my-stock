"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { DeleteTransactionButton } from "@/features/transactions/components/delete-transaction-button";
import { EditTransactionDialog } from "@/features/transactions/components/edit-transaction-dialog";

export function RecentTransactionsModule({ model }: DashboardModuleProps) {
  const transactions = model.dashboard.recentTransactions;

  return (
    <Card className="module-card module-recent-transactions h-full border-border/70">
      <CardHeader className="module-card-header module-recent-transactions-header">
        <CardTitle className="module-recent-transactions-title">Recent Transactions</CardTitle>
        <CardDescription className="module-recent-transactions-description">
          Stored in `transaction` and reflected into `position` via server action.
        </CardDescription>
      </CardHeader>
      <CardContent className="module-recent-transactions-content space-y-3">
        {transactions.length === 0 ? (
          <div className="module-recent-transactions-empty rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="module-recent-transaction-item rounded-xl border border-border/70 bg-muted/20 p-3"
            >
              <div className="module-recent-transaction-top flex items-center justify-between gap-3">
                <div className="module-recent-transaction-symbol-group flex min-w-0 items-center gap-2">
                  <div className="module-recent-transaction-symbol font-medium">{tx.symbol}</div>
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
                <div className="module-recent-transaction-actions flex items-center gap-1">
                  <EditTransactionDialog transaction={tx} />
                  <DeleteTransactionButton transactionId={tx.id} symbol={tx.symbol} />
                </div>
              </div>
              <div className="module-recent-transaction-meta mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Qty: {tx.quantity}</span>
                <span>Price: {formatCurrency(tx.unitPrice)}</span>
                <span>Fee: {formatCurrency(tx.feeAmount)}</span>
                <span>Tax: {formatCurrency(tx.taxAmount)}</span>
                <span className="col-span-2">Trade Date: {formatDate(tx.tradeDate)}</span>
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
