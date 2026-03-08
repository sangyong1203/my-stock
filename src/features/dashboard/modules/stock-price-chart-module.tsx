"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardSelection } from "@/features/dashboard/components/dashboard-selection-provider";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import type { StockChartData } from "@/features/market-data/server/stock-chart-service";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type ChartRange = "1m" | "3m" | "6m" | "1y";

type ChartMarker = {
  id: string;
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  tradeDate: string;
};

const CHART_RANGES: ChartRange[] = ["1m", "3m", "6m", "1y"];

function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatVolume(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function toTradeDateKey(value: Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function calculateMovingAverage(points: StockChartData["points"], period: number) {
  return points.map((_, index) => {
    if (index < period - 1) {
      return null;
    }

    let sum = 0;
    for (let current = index - period + 1; current <= index; current += 1) {
      sum += points[current].close;
    }

    return Number((sum / period).toFixed(2));
  });
}

function buildChartOption(
  chart: StockChartData,
  markers: ChartMarker[],
  averageCost: number | null,
): EChartsOption {
  const dates = chart.points.map((point) => point.date);
  const candles = chart.points.map((point) => [point.open, point.close, point.low, point.high]);
  const ma5 = calculateMovingAverage(chart.points, 5);
  const ma20 = calculateMovingAverage(chart.points, 20);
  const ma60 = calculateMovingAverage(chart.points, 60);
  const ma120 = calculateMovingAverage(chart.points, 120);
  const averageCostSeries = dates.map(() => averageCost);
  const buyMarkers = markers
    .filter((marker) => marker.side === "buy")
    .map((marker) => ({
      id: marker.id,
      name: `Buy ${marker.quantity}`,
      value: marker.unitPrice,
      quantity: marker.quantity,
      tradeDate: marker.tradeDate,
      coord: [marker.tradeDate, marker.unitPrice] as [string, number],
      itemStyle: { color: "#10b981" },
    }));
  const sellMarkers = markers
    .filter((marker) => marker.side === "sell")
    .map((marker) => ({
      id: marker.id,
      name: `Sell ${marker.quantity}`,
      value: marker.unitPrice,
      quantity: marker.quantity,
      tradeDate: marker.tradeDate,
      coord: [marker.tradeDate, marker.unitPrice] as [string, number],
      itemStyle: { color: "#f43f5e" },
    }));
  const volumes = chart.points.map((point, index, points) => {
    const previousClose = points[index - 1]?.close ?? point.open;
    const isUp = point.close >= previousClose;

    return {
      value: point.volume,
      itemStyle: {
        color: isUp ? "rgba(16, 185, 129, 0.65)" : "rgba(244, 63, 94, 0.65)",
      },
    };
  });

  return {
    animationDuration: 350,
    animationDurationUpdate: 250,
    backgroundColor: "transparent",
    legend: {
      show: true,
      top: 8,
      left: 12,
      itemWidth: 18,
      itemHeight: 8,
      textStyle: {
        color: "rgba(255,255,255,0.72)",
        fontSize: 11,
      },
      selectedMode: false,
    },
    axisPointer: {
      link: [{ xAxisIndex: "all" }],
      label: {
        backgroundColor: "rgba(18, 18, 18, 0.95)",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      backgroundColor: "rgba(10, 10, 10, 0.92)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      textStyle: {
        color: "#f5f5f5",
        fontFamily: "inherit",
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const candle = items.find(
          (item) => typeof item === "object" && item && "seriesType" in item && item.seriesType === "candlestick",
        ) as
          | {
              axisValueLabel?: string;
              data?: [number, number, number, number];
              dataIndex?: number;
            }
          | undefined;
        const volume = items.find(
          (item) => typeof item === "object" && item && "seriesType" in item && item.seriesType === "bar",
        ) as { data?: number | { value: number } } | undefined;
        const tradeMarker = items.find(
          (item) => typeof item === "object" && item && "seriesType" in item && item.seriesType === "scatter",
        ) as
          | {
              seriesName?: string;
              data?: { quantity?: number; value?: number };
            }
          | undefined;
        const candleValue = candle?.data ?? [0, 0, 0, 0];
        const pointIndex = candle?.dataIndex ?? 0;
        const volumeValue =
          typeof volume?.data === "number"
            ? volume.data
            : typeof volume?.data === "object" && volume?.data
              ? volume.data.value
              : 0;

        return [
          `<div class="mb-1 text-xs text-zinc-400">${candle?.axisValueLabel ?? ""}</div>`,
          `<div>Open: <strong>${formatChartValue(candleValue[0])}</strong></div>`,
          `<div>Close: <strong>${formatChartValue(candleValue[1])}</strong></div>`,
          `<div>Low: <strong>${formatChartValue(candleValue[2])}</strong></div>`,
          `<div>High: <strong>${formatChartValue(candleValue[3])}</strong></div>`,
          `<div>Avg Cost: <strong>${formatChartValue(Number(averageCost ?? candleValue[1]))}</strong></div>`,
          `<div>MA5: <strong>${formatChartValue(Number(ma5[pointIndex] ?? candleValue[1]))}</strong></div>`,
          `<div>MA20: <strong>${formatChartValue(Number(ma20[pointIndex] ?? candleValue[1]))}</strong></div>`,
          `<div>MA60: <strong>${formatChartValue(Number(ma60[pointIndex] ?? candleValue[1]))}</strong></div>`,
          `<div>MA120: <strong>${formatChartValue(Number(ma120[pointIndex] ?? candleValue[1]))}</strong></div>`,
          `<div>Volume: <strong>${formatVolume(volumeValue)}</strong></div>`,
          tradeMarker
            ? `<div>${tradeMarker.seriesName}: <strong>${tradeMarker.data?.quantity ?? 0} @ ${formatChartValue(Number(tradeMarker.data?.value ?? 0))}</strong></div>`
            : "",
        ].join("");
      },
    },
    toolbox: {
      show: true,
      right: 8,
      top: 8,
      itemSize: 14,
      iconStyle: {
        borderColor: "rgba(255,255,255,0.55)",
      },
      emphasis: {
        iconStyle: {
          borderColor: "#ffffff",
        },
      },
      feature: {
        brush: {
          type: ["lineX", "clear"],
        },
      },
    },
    brush: {
      xAxisIndex: "all",
      brushLink: "all",
      outOfBrush: {
        colorAlpha: 0.12,
      },
      brushStyle: {
        borderWidth: 1,
        color: "rgba(59, 130, 246, 0.12)",
        borderColor: "rgba(59, 130, 246, 0.65)",
      },
    },
    grid: [
      { left: 12, right: 12, top: "10%", height: "56%" },
      { left: 12, right: 12, top: "70%", height: "18%" },
    ],
    xAxis: [
      {
        type: "category",
        data: dates,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      },
      {
        type: "category",
        gridIndex: 1,
        data: dates,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          interval: Math.max(Math.floor(dates.length / 6), 0),
        },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      },
    ],
    yAxis: [
      {
        scale: true,
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          formatter: (value: number) => formatChartValue(value),
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            type: "dashed",
          },
        },
      },
      {
        gridIndex: 1,
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          formatter: (value: number) => formatVolume(value),
        },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: [0, 1],
        start: Math.max(0, 100 - Math.min(100, (90 / Math.max(chart.points.length, 1)) * 100)),
        end: 100,
      },
      {
        type: "slider",
        xAxisIndex: [0, 1],
        bottom: "2%",
        height: 20,
        borderColor: "rgba(255,255,255,0.08)",
        fillerColor: "rgba(59, 130, 246, 0.14)",
        backgroundColor: "rgba(255,255,255,0.03)",
        dataBackground: {
          lineStyle: { color: "rgba(255,255,255,0.25)" },
          areaStyle: { color: "rgba(255,255,255,0.06)" },
        },
        handleStyle: {
          color: "rgba(255,255,255,0.55)",
          borderColor: "rgba(255,255,255,0.7)",
        },
        moveHandleStyle: {
          color: "rgba(255,255,255,0.2)",
        },
        textStyle: {
          color: "rgba(255,255,255,0.42)",
        },
        start: Math.max(0, 100 - Math.min(100, (90 / Math.max(chart.points.length, 1)) * 100)),
        end: 100,
      },
    ],
    series: [
      {
        name: "Price",
        type: "candlestick",
        data: candles,
        itemStyle: {
          color: "#10b981",
          color0: "#f43f5e",
          borderColor: "#10b981",
          borderColor0: "#f43f5e",
        },
        emphasis: {
          itemStyle: {
            borderWidth: 2,
          },
        },
      },
      {
        name: "Avg Cost",
        type: "line",
        data: averageCostSeries,
        showSymbol: false,
        connectNulls: true,
        lineStyle: {
          width: 1.25,
          color: "#f97316",
          type: "dashed",
        },
        itemStyle: {
          color: "#f97316",
        },
        emphasis: {
          disabled: true,
        },
        tooltip: {
          show: false,
        },
      },
      {
        name: "MA5",
        type: "line",
        data: ma5,
        showSymbol: false,
        smooth: true,
        connectNulls: false,
        lineStyle: {
          width: 1.5,
          color: "#f59e0b",
        },
        itemStyle: {
          color: "#f59e0b",
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "MA20",
        type: "line",
        data: ma20,
        showSymbol: false,
        smooth: true,
        connectNulls: false,
        lineStyle: {
          width: 1.5,
          color: "#38bdf8",
        },
        itemStyle: {
          color: "#38bdf8",
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "MA60",
        type: "line",
        data: ma60,
        showSymbol: false,
        smooth: true,
        connectNulls: false,
        lineStyle: {
          width: 1.5,
          color: "#a855f7",
        },
        itemStyle: {
          color: "#a855f7",
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "MA120",
        type: "line",
        data: ma120,
        showSymbol: false,
        smooth: true,
        connectNulls: false,
        lineStyle: {
          width: 1.5,
          color: "#22d3ee",
        },
        itemStyle: {
          color: "#22d3ee",
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "Volume",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        barMaxWidth: 10,
      },
      {
        name: "Buy",
        type: "scatter",
        data: buyMarkers,
        symbol: "triangle",
        symbolSize: 14,
        z: 6,
      },
      {
        name: "Sell",
        type: "scatter",
        data: sellMarkers,
        symbol: "pin",
        symbolSize: 18,
        z: 6,
      },
    ],
  };
}

export function StockPriceChartModule({ model }: DashboardModuleProps) {
  const { selectedSecurity, setSelectedSecurity } = useDashboardSelection();
  const positions = useMemo(
    () =>
      model.dashboard.positions.map((position) => ({
        symbol: position.symbol,
        market: position.market,
        label: `${position.symbol} · ${position.market}`,
      })),
    [model.dashboard.positions],
  );
  const [selectedRange, setSelectedRange] = useState<ChartRange>("3m");
  const [chart, setChart] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !selectedSecurity ||
      !positions.some(
        (position) =>
          position.symbol === selectedSecurity.symbol &&
          position.market === selectedSecurity.market,
      )
    ) {
      if (positions[0]) {
        setSelectedSecurity({
          symbol: positions[0].symbol,
          market: positions[0].market,
        });
      }
    }
  }, [positions, selectedSecurity, setSelectedSecurity]);

  const activePosition =
    model.dashboard.positions.find(
      (position) =>
        position.symbol === selectedSecurity?.symbol &&
        position.market === selectedSecurity?.market,
    ) ?? model.dashboard.positions[0] ?? null;

  const chartTransactions = useMemo(() => {
    return model.dashboard.chartTransactions
      .filter(
        (transaction) =>
          transaction.symbol === activePosition?.symbol &&
          transaction.market === activePosition?.market,
      )
      .map((transaction) => ({
        id: transaction.id,
        side: transaction.side,
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        tradeDate: toTradeDateKey(transaction.tradeDate),
      }));
  }, [activePosition?.market, activePosition?.symbol, model.dashboard.chartTransactions]);

  const selectedMarker = useMemo(
    () => chartTransactions.find((transaction) => transaction.id === selectedMarkerId) ?? null,
    [chartTransactions, selectedMarkerId],
  );

  useEffect(() => {
    setSelectedMarkerId(null);
  }, [activePosition?.market, activePosition?.symbol, selectedRange]);

  useEffect(() => {
    if (!activePosition) {
      setChart(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/market-data/stock-chart?symbol=${encodeURIComponent(activePosition.symbol)}&market=${encodeURIComponent(activePosition.market)}&range=${selectedRange}`,
          { cache: "no-store" },
        );

        const payload = (await response.json()) as
          | { ok: true; data: StockChartData }
          | { ok: false; message?: string };

        if (!response.ok || !payload.ok) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "Failed to load chart data.",
          );
        }

        if (!cancelled) {
          setChart(payload.data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setChart(null);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load chart data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activePosition, selectedRange]);

  const positive = (chart?.change ?? 0) >= 0;
  const chartOption = useMemo(() => {
    if (!chart) {
      return null;
    }

    const availableDates = new Set(chart.points.map((point) => point.date));
    const visibleMarkers = chartTransactions.filter((transaction) =>
      availableDates.has(transaction.tradeDate),
    );

    return buildChartOption(chart, visibleMarkers, activePosition?.avgCost ?? null);
  }, [activePosition?.avgCost, chart, chartTransactions]);
  const latestVolume = chart?.points.at(-1)?.volume ?? 0;
  const chartEvents = useMemo(
    () => ({
      click: (params: { seriesType?: string; data?: { id?: string } }) => {
        if (params.seriesType !== "scatter") {
          return;
        }

        setSelectedMarkerId(params.data?.id ?? null);
      },
    }),
    [],
  );

  return (
    <Card className="module-card module-stock-price-chart flex h-full flex-col border-border/70">
      <CardHeader className="module-card-header module-stock-price-chart-header gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="module-stock-price-chart-title">Stock Price Chart</CardTitle>
            <CardDescription className="module-stock-price-chart-description">
              Candlestick view with brush selection for the current module symbol.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={activePosition ? `${activePosition.symbol}:${activePosition.market}` : ""}
              onChange={(event) => {
                const [symbol, market] = event.target.value.split(":");
                setSelectedSecurity(symbol && market ? { symbol, market } : null);
              }}
              className="module-stock-price-chart-symbol-select h-9 rounded-lg border border-border/70 bg-background px-3 text-sm"
              disabled={positions.length === 0}
            >
              {positions.map((position) => (
                <option
                  key={`${position.symbol}:${position.market}`}
                  value={`${position.symbol}:${position.market}`}
                >
                  {position.label}
                </option>
              ))}
            </select>
            <div className="module-stock-price-chart-range-tabs flex items-center gap-1 rounded-lg border border-border/70 p-1">
              {CHART_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    selectedRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        {chart ? (
          <div className="module-stock-price-chart-metrics flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="text-3xl font-semibold tracking-tight">
                {formatChartValue(chart.latestClose)}
              </div>
              <div className={positive ? "text-emerald-500" : "text-rose-500"}>
                {chart.change >= 0 ? "+" : ""}
                {formatChartValue(chart.change)} ({chart.changePercent >= 0 ? "+" : ""}
                {Math.abs(chart.changePercent).toFixed(2)}%)
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Latest volume {formatVolume(latestVolume)}
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="module-stock-price-chart-content flex min-h-0 flex-1 flex-col">
        {positions.length === 0 ? (
          <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
            No positions available for charting yet.
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
            Loading chart data...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
            {error}
          </div>
        ) : chart && chartOption ? (
          <div className="module-stock-price-chart-surface flex min-h-0 flex-1 flex-col rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{activePosition ? `${activePosition.symbol} · ${activePosition.market}` : ""}</span>
              <span>{chart.points.at(-1)?.date ?? ""}</span>
            </div>
            <div className="min-h-[280px] flex-1">
              <ReactECharts
                option={chartOption}
                notMerge
                lazyUpdate
                style={{ height: "100%", width: "100%" }}
                className="module-stock-price-chart-echarts"
                onEvents={chartEvents}
              />
            </div>
            {selectedMarker ? (
              <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {selectedMarker.side === "buy" ? "Buy trade" : "Sell trade"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMarkerId(null)}
                    className="text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em]">Date</div>
                    <div className="text-foreground">{selectedMarker.tradeDate}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em]">Quantity</div>
                    <div className="text-foreground">{selectedMarker.quantity}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em]">Unit Price</div>
                    <div className="text-foreground">
                      {formatChartValue(selectedMarker.unitPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em]">Average Cost</div>
                    <div className="text-foreground">
                      {activePosition ? formatChartValue(activePosition.avgCost) : "-"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
