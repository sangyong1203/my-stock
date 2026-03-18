"use client";

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
import { useDashboardSelection } from "@/features/dashboard/components/dashboard-selection-provider";
import { formatCompactNumber, formatCurrency } from "@/features/dashboard/lib/format";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import { SyncMarketPricesButton } from "@/features/market-data/components/sync-market-prices-button";
import { SecurityMemoDialog } from "@/features/notes/components/security-memo-dialog";
import { CreateTransactionDialog } from "@/features/transactions/components/create-transaction-dialog";

export function OpenPositionsModule({ model }: DashboardModuleProps) {
  const positions = model.dashboard.positions;
  const { selectedSecurity, setSelectedSecurity } = useDashboardSelection();
  const { isAuthenticated } = model;

  return (
    <Card className="module-card module-open-positions flex h-full min-w-0 flex-col border-border/70">
      <CardHeader className="module-card-header module-open-positions-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="module-open-positions-title">Open Positions</CardTitle>
            <CardDescription className="module-open-positions-description">
              Unrealized P/L uses `currentPrice - averageCost` on current quantity.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <SyncMarketPricesButton className="border-white/20 bg-white/5 text-white hover:bg-white/10" />
            ) : null}
            <CreateTransactionDialog
              triggerClassName="bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="module-open-positions-content flex flex-1 min-h-0">
        <div className="module-open-positions-table-wrap flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70">
          {positions.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-muted-foreground">
              No positions yet. Add your first trade.
            </div>
          ) : (
            <div className="flex h-0 min-h-0 flex-1 flex-col overflow-y-auto">
              <Table className="min-w-[1180px] text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">Cur</TableHead>
                    <TableHead className="text-right">Chg</TableHead>
                    <TableHead className="text-right">Chg %</TableHead>
                    <TableHead className="text-right">Vol</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">U P/L</TableHead>
                    <TableHead className="text-right">P/L %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((row) => {
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
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{row.symbol}</div>
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground"
                            >
                              {row.market}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.avgCost, row.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.currentPrice, row.currency)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            row.changeAmount === null
                              ? "text-muted-foreground"
                              : row.changeAmount >= 0
                                ? "text-emerald-500"
                                : "text-rose-500"
                          }`}
                        >
                          {row.changeAmount === null
                            ? "-"
                            : `${row.changeAmount >= 0 ? "+" : ""}${formatCurrency(row.changeAmount, row.currency)}`}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            row.changePercent === null
                              ? "text-muted-foreground"
                              : row.changePercent >= 0
                                ? "text-emerald-500"
                                : "text-rose-500"
                          }`}
                        >
                          {row.changePercent === null
                            ? "-"
                            : `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(2)}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.latestVolume === null
                            ? "-"
                            : formatCompactNumber(row.latestVolume)}
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
                              triggerClassName="h-7 px-2.5 text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
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
                              triggerClassName="h-7 px-2.5 text-xs bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                              initialValues={{
                                symbol: row.symbol,
                                securityName: row.name,
                                market: row.market,
                                currency: row.currency,
                                side: "sell",
                              }}
                            />
                            <SecurityMemoDialog
                              symbol={row.symbol}
                              securityId={row.securityId}
                              notes={row.notes}
                              triggerClassName="h-7 px-2.5 text-xs"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
