"use client";

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
import { useDashboardSelection } from "@/features/dashboard/components/dashboard-selection-provider";
import { formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { CreateTransactionDialog } from "@/features/transactions/components/create-transaction-dialog";

export function OpenPositionsModule({ model }: DashboardModuleProps) {
  const positions = model.dashboard.positions;
  const { selectedSecurity, setSelectedSecurity } = useDashboardSelection();

  return (
    <Card className="module-card module-open-positions h-full min-w-0 border-border/70">
      <CardHeader className="module-card-header module-open-positions-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="module-open-positions-title">Open Positions</CardTitle>
            <CardDescription className="module-open-positions-description">
              Unrealized P/L uses `currentPrice - averageCost` on current quantity.
            </CardDescription>
          </div>
          <CreateTransactionDialog
            triggerClassName="bg-white/10 text-white hover:bg-white/20"
          />
        </div>
      </CardHeader>
      <CardContent className="module-open-positions-content">
        <div className="module-open-positions-table-wrap rounded-xl border border-border/70">
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No positions yet. Add your first trade.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((row) => {
                  const pnlRate =
                    row.avgCost === 0
                      ? 0
                      : ((row.currentPrice - row.avgCost) / row.avgCost) * 100;
                  const unrealizedPnl = row.quantity * (row.currentPrice - row.avgCost);
                  const positionValue = row.quantity * row.currentPrice;
                  const positive = pnlRate >= 0;
                  const isSelected =
                    selectedSecurity?.symbol === row.symbol &&
                    selectedSecurity?.market === row.market;

                  return (
                    <TableRow
                      key={`${row.market}:${row.symbol}`}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-muted/40" : ""
                      }`}
                      onClick={() =>
                        setSelectedSecurity({
                          symbol: row.symbol,
                          market: row.market,
                        })
                      }
                    >
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
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <CreateTransactionDialog
                            triggerLabel="Buy"
                            triggerClassName="h-8 px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            initialValues={{
                              symbol: row.symbol,
                              securityName: row.name,
                              market: row.market,
                              currency: row.currency,
                              side: "buy",
                            }}
                          />
                          <CreateTransactionDialog
                            triggerLabel="Sell"
                            triggerClassName="h-8 px-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            initialValues={{
                              symbol: row.symbol,
                              securityName: row.name,
                              market: row.market,
                              currency: row.currency,
                              side: "sell",
                            }}
                          />
                        </div>
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
