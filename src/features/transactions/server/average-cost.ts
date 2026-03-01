export type PositionState = {
  quantity: number;
  avgCostPerShare: number;
  totalCostBasis: number;
  realizedPnl: number;
};

export type TradeInput = {
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  feeAmount?: number;
  taxAmount?: number;
};

export type TradeApplyResult = {
  next: PositionState;
  realizedDelta: number;
  soldCostBasis: number;
  proceeds: number;
};

export function applyAverageCostTradeDetailed(
  current: PositionState,
  trade: TradeInput,
): TradeApplyResult {
  const fee = trade.feeAmount ?? 0;
  const tax = trade.taxAmount ?? 0;

  if (trade.quantity <= 0) {
    throw new Error("quantity must be greater than 0");
  }
  if (trade.unitPrice < 0) {
    throw new Error("unitPrice must be 0 or greater");
  }

  if (trade.side === "buy") {
    const buyCost = trade.quantity * trade.unitPrice + fee + tax;
    const nextQuantity = current.quantity + trade.quantity;
    const nextTotalCost = current.totalCostBasis + buyCost;

    return {
      next: {
        quantity: nextQuantity,
        totalCostBasis: nextTotalCost,
        avgCostPerShare: nextQuantity === 0 ? 0 : nextTotalCost / nextQuantity,
        realizedPnl: current.realizedPnl,
      },
      realizedDelta: 0,
      soldCostBasis: 0,
      proceeds: 0,
    };
  }

  if (trade.quantity > current.quantity) {
    throw new Error("sell quantity exceeds current holding quantity");
  }

  const avgCost = current.quantity === 0 ? 0 : current.totalCostBasis / current.quantity;
  const proceeds = trade.quantity * trade.unitPrice - fee - tax;
  const soldCostBasis = avgCost * trade.quantity;
  const realizedDelta = proceeds - soldCostBasis;
  const nextQuantity = current.quantity - trade.quantity;
  const nextTotalCost = current.totalCostBasis - soldCostBasis;

  return {
    next: {
      quantity: nextQuantity,
      totalCostBasis: nextQuantity === 0 ? 0 : nextTotalCost,
      avgCostPerShare: nextQuantity === 0 ? 0 : nextTotalCost / nextQuantity,
      realizedPnl: current.realizedPnl + realizedDelta,
    },
    realizedDelta,
    soldCostBasis,
    proceeds,
  };
}

export function applyAverageCostTrade(
  current: PositionState,
  trade: TradeInput,
): PositionState {
  return applyAverageCostTradeDetailed(current, trade).next;
}

export const EMPTY_POSITION: PositionState = {
  quantity: 0,
  avgCostPerShare: 0,
  totalCostBasis: 0,
  realizedPnl: 0,
};
