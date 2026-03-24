"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ECharts, EChartsOption } from "echarts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardSelection } from "@/features/dashboard/components/dashboard-selection-provider";
import type { DashboardModuleProps } from "@/features/dashboard/types";
import type { StockChartData } from "@/features/market-data/server/stock-chart-service";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type ChartRange = "6m" | "1y" | "2y" | "5y" | "10y" | "all";
type ChartInterval = "day" | "week" | "month";

type ChartMarker = {
  id: string;
  side: "buy" | "sell";
  quantity: number;
  unitPrice: number;
  tradeDate: string;
};

type IndicatorKey = "rsi" | "macd" | "volume";

const CHART_RANGES: ChartRange[] = ["6m", "1y", "2y", "5y", "10y", "all"];
const CHART_INTERVALS: ChartInterval[] = ["day", "week", "month"];
const CHART_RIGHT_GUTTER = 64;

function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ChartStat({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`module-stock-price-chart-stat text-right ${className ?? ""}`}>
      <div
        className={`module-stock-price-chart-stat-label text-[10px] uppercase tracking-[0.12em] text-muted-foreground ${labelClassName ?? ""}`}
      >
        {label}
      </div>
      <div
        className={`module-stock-price-chart-stat-value text-xs font-normal text-muted-foreground ${valueClassName ?? ""}`}
      >
        {formatChartValue(value)}
      </div>
    </div>
  );
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

function formatShortDate(value: string) {
  const [, month, day] = value.split("-");
  if (!month || !day) {
    return value;
  }

  return `${month}-${day}`;
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

function calculateRsi(points: StockChartData["points"], period = 14) {
  const values = Array<number | null>(points.length).fill(null);

  if (points.length <= period) {
    return values;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = points[index].close - points[index - 1].close;
    if (delta >= 0) {
      gainSum += delta;
    } else {
      lossSum += Math.abs(delta);
    }
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  values[period] =
    averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < points.length; index += 1) {
    const delta = points[index].close - points[index - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;

    values[index] =
      averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return values.map((value) =>
    value === null ? null : Number(value.toFixed(2)),
  );
}

function calculateEma(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  const ema = Array<number | null>(values.length).fill(null);

  if (values.length < period) {
    return ema;
  }

  let seed = 0;
  for (let index = 0; index < period; index += 1) {
    seed += values[index];
  }

  ema[period - 1] = seed / period;

  for (let index = period; index < values.length; index += 1) {
    const previous = ema[index - 1] ?? values[index - 1];
    ema[index] = (values[index] - previous) * multiplier + previous;
  }

  return ema;
}

function calculateMacd(points: StockChartData["points"]) {
  const closes = points.map((point) => point.close);
  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  const diff = closes.map((_, index) => {
    const short = ema12[index];
    const long = ema26[index];

    if (short === null || long === null) {
      return null;
    }

    return Number((short - long).toFixed(3));
  });

  const diffValues = diff.map((value) => value ?? 0);
  const signalRaw = calculateEma(diffValues, 9);
  const signal = signalRaw.map((value, index) =>
    diff[index] === null || value === null ? null : Number(value.toFixed(3)),
  );
  const histogram = diff.map((value, index) => {
    if (value === null || signal[index] === null) {
      return null;
    }

    return Number((value - (signal[index] ?? 0)).toFixed(3));
  });

  return { diff, signal, histogram };
}

function createPaneLayout(enabledIndicators: IndicatorKey[]) {
  const supplementalKeys = [
    ...(enabledIndicators.includes("rsi") ? (["rsi"] as const) : []),
    ...(enabledIndicators.includes("macd") ? (["macd"] as const) : []),
    ...(enabledIndicators.includes("volume") ? (["volume"] as const) : []),
  ];

  if (supplementalKeys.length === 0) {
    return [{ key: "price" as const, top: "10%", height: "76%" }];
  }

  if (supplementalKeys.length === 1) {
    return [
      { key: "price" as const, top: "8%", height: "56%" },
      { key: supplementalKeys[0], top: "68%", height: "18%" },
    ];
  }

  if (supplementalKeys.length === 2) {
    return [
      { key: "price" as const, top: "8%", height: "44%" },
      { key: supplementalKeys[0], top: "56%", height: "12%" },
      { key: supplementalKeys[1], top: "72%", height: "14%" },
    ];
  }

  return [
    { key: "price" as const, top: "8%", height: "34%" },
    { key: "rsi" as const, top: "46%", height: "10%" },
    { key: "macd" as const, top: "60%", height: "10%" },
    { key: "volume" as const, top: "74%", height: "12%" },
  ];
}

function buildChartOption(
  chart: StockChartData,
  markers: ChartMarker[],
  averageCost: number | null,
  enabledIndicators: IndicatorKey[],
): EChartsOption {
  const rightGutter = CHART_RIGHT_GUTTER;
  const dates = chart.points.map((point) => point.date);
  const candles = chart.points.map((point) => [point.open, point.close, point.low, point.high]);
  const indicatorSourcePoints = chart.indicatorPoints.length > 0 ? chart.indicatorPoints : chart.points;
  const visibleOffset = Math.max(0, indicatorSourcePoints.length - chart.points.length);
  const ma20 = calculateMovingAverage(indicatorSourcePoints, 20).slice(visibleOffset);
  const ma60 = calculateMovingAverage(indicatorSourcePoints, 60).slice(visibleOffset);
  const ma120 = calculateMovingAverage(indicatorSourcePoints, 120).slice(visibleOffset);
  const rsi = calculateRsi(indicatorSourcePoints).slice(visibleOffset);
  const macdRaw = calculateMacd(indicatorSourcePoints);
  const macd = {
    diff: macdRaw.diff.slice(visibleOffset),
    signal: macdRaw.signal.slice(visibleOffset),
    histogram: macdRaw.histogram.slice(visibleOffset),
  };
  const averageCostSeries = dates.map(() => averageCost);
  const paneLayout = createPaneLayout(enabledIndicators);
  const paneIndexByKey = new Map(paneLayout.map((pane, index) => [pane.key, index]));
  const volumePaneIndex = paneIndexByKey.get("volume");
  const rsiPaneIndex = paneIndexByKey.get("rsi");
  const macdPaneIndex = paneIndexByKey.get("macd");
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

  const rsiSeries =
    rsiPaneIndex === undefined
      ? []
      : [
          {
            name: "RSI14",
            type: "line" as const,
            xAxisIndex: rsiPaneIndex,
            yAxisIndex: rsiPaneIndex,
            data: rsi,
            showSymbol: false,
            smooth: true,
            lineStyle: {
              width: 1.4,
              color: "#22c55e",
            },
            itemStyle: {
              color: "#22c55e",
            },
            markLine: {
              symbol: "none",
              lineStyle: {
                color: "rgba(255,255,255,0.18)",
                type: "dashed" as const,
              },
              label: {
                show: false,
              },
              data: [{ yAxis: 70 }, { yAxis: 30 }],
            },
            emphasis: {
              disabled: true,
            },
          },
        ];

  const macdSeries =
    macdPaneIndex === undefined
      ? []
      : [
          {
            name: "MACD Hist",
            type: "bar" as const,
            xAxisIndex: macdPaneIndex,
            yAxisIndex: macdPaneIndex,
            data: macd.histogram.map((value) =>
              value === null
                ? null
                : {
                    value,
                    itemStyle: {
                      color:
                        value >= 0
                          ? "rgba(16, 185, 129, 0.55)"
                          : "rgba(244, 63, 94, 0.55)",
                    },
                  },
            ),
            barMaxWidth: 8,
          },
          {
            name: "MACD",
            type: "line" as const,
            xAxisIndex: macdPaneIndex,
            yAxisIndex: macdPaneIndex,
            data: macd.diff,
            showSymbol: false,
            smooth: true,
            lineStyle: {
              width: 1.3,
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
            name: "Signal",
            type: "line" as const,
            xAxisIndex: macdPaneIndex,
            yAxisIndex: macdPaneIndex,
            data: macd.signal,
            showSymbol: false,
            smooth: true,
            lineStyle: {
              width: 1.3,
              color: "#38bdf8",
            },
            itemStyle: {
              color: "#38bdf8",
            },
            emphasis: {
              disabled: true,
            },
          },
        ];

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
      data: [
        "Avg Cost",
        "MA20",
        "MA60",
        "MA120",
        ...(enabledIndicators.includes("volume") ? ["Volume"] : []),
        "Buy",
        "Sell",
        ...(enabledIndicators.includes("rsi") ? ["RSI14"] : []),
        ...(enabledIndicators.includes("macd") ? ["MACD Hist", "MACD", "Signal"] : []),
      ],
    },
    axisPointer: {
      link: [{ xAxisIndex: "all" }],
      snap: true,
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
        const axisItem = items.find(
          (item) => typeof item === "object" && item && "dataIndex" in item,
        ) as
          | {
              axisValueLabel?: string;
              dataIndex?: number;
            }
          | undefined;
        const tradeMarker = items.find(
          (item) => typeof item === "object" && item && "seriesType" in item && item.seriesType === "scatter",
        ) as
          | {
              seriesName?: string;
              data?: { quantity?: number; value?: number };
            }
          | undefined;
        const pointIndex = axisItem?.dataIndex ?? 0;
        const point = chart.points[pointIndex];

        if (!point) {
          return "";
        }

        return [
          `<div class="mb-1 text-xs text-zinc-400">${formatShortDate(axisItem?.axisValueLabel ?? point.date)}</div>`,
          `<div>Open: <strong>${formatChartValue(point.open)}</strong></div>`,
          `<div>Close: <strong>${formatChartValue(point.close)}</strong></div>`,
          `<div>Low: <strong>${formatChartValue(point.low)}</strong></div>`,
          `<div>High: <strong>${formatChartValue(point.high)}</strong></div>`,
          `<div>Avg Cost: <strong>${formatChartValue(Number(averageCost ?? point.close))}</strong></div>`,
          `<div>MA20: <strong>${formatChartValue(Number(ma20[pointIndex] ?? point.close))}</strong></div>`,
          `<div>MA60: <strong>${formatChartValue(Number(ma60[pointIndex] ?? point.close))}</strong></div>`,
          `<div>MA120: <strong>${formatChartValue(Number(ma120[pointIndex] ?? point.close))}</strong></div>`,
          `<div>Volume: <strong>${formatVolume(point.volume)}</strong></div>`,
          tradeMarker
            ? `<div>${tradeMarker.seriesName}: <strong>${tradeMarker.data?.quantity ?? 0} @ ${formatChartValue(Number(tradeMarker.data?.value ?? 0))}</strong></div>`
            : "",
        ].join("");
      },
    },
    toolbox: {
      show: true,
      right: rightGutter - 8,
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
    grid: paneLayout.map((pane) => ({
      left: 12,
      right: rightGutter,
      top: pane.top,
      height: pane.height,
    })),
    xAxis: paneLayout.map((pane, index) => ({
      type: "category",
      gridIndex: index,
      data: dates,
      boundaryGap: true,
      axisPointer:
        index === paneLayout.length - 1
          ? {
              label: {
                show: true,
                formatter: (params: { value?: unknown }) =>
                  formatShortDate(String(params?.value ?? "")),
              },
              lineStyle: {
                color: "transparent",
              },
            }
          : {
              label: {
                show: false,
              },
              lineStyle: {
                color: "transparent",
              },
            },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel:
        index === paneLayout.length - 1
          ? {
              show: true,
              color: "rgba(255,255,255,0.42)",
              fontSize: 10,
              interval: (labelIndex: number) =>
                labelIndex !== 0 &&
                labelIndex !== dates.length - 1 &&
                labelIndex % Math.max(Math.floor(dates.length / 6), 1) === 0,
              formatter: (value: string) => formatShortDate(value),
              hideOverlap: true,
            }
          : { show: false },
      splitLine: { show: false },
      min: "dataMin",
      max: "dataMax",
    })),
    yAxis: paneLayout.map((pane, index) => {
      if (pane.key === "volume") {
        return {
          gridIndex: index,
          position: "right",
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: "rgba(255,255,255,0.42)",
            fontSize: 10,
            formatter: (value: number) => formatVolume(value),
          },
          splitLine: { show: false },
        };
      }

      if (pane.key === "rsi") {
        return {
          gridIndex: index,
          min: 0,
          max: 100,
          position: "right",
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: "rgba(255,255,255,0.42)",
            fontSize: 10,
          },
          splitLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.06)",
              type: "dashed",
            },
          },
        };
      }

      return {
        gridIndex: index,
        scale: true,
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          formatter: (value: number) =>
            pane.key === "price" ? formatChartValue(value) : formatChartValue(value),
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.08)",
            type: "dashed",
          },
        },
      };
    }),
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: paneLayout.map((_, index) => index),
        start: Math.max(0, 100 - Math.min(100, (90 / Math.max(chart.points.length, 1)) * 100)),
        end: 100,
      },
      {
        type: "slider",
        xAxisIndex: paneLayout.map((_, index) => index),
        bottom: "2%",
        height: 20,
        showDetail: false,
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
          color: "#f97316",
        },
        itemStyle: {
          color: "#f97316",
        },
        emphasis: {
          disabled: true,
        },
      },
      ...(volumePaneIndex === undefined
        ? []
        : [
            {
              name: "Volume",
              type: "bar" as const,
              xAxisIndex: volumePaneIndex,
              yAxisIndex: volumePaneIndex,
              data: volumes,
              barMaxWidth: 10,
            },
          ]),
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
      ...rsiSeries,
      ...macdSeries,
    ],
  };
}

export function StockPriceChartModule({ model }: DashboardModuleProps) {
  const chartRef = useRef<ECharts | null>(null);
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
  const [selectedRange, setSelectedRange] = useState<ChartRange>("1y");
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>("day");
  const [chart, setChart] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [enabledIndicators, setEnabledIndicators] = useState<IndicatorKey[]>(["volume"]);
  const [sharedPointerX, setSharedPointerX] = useState<number | null>(null);

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
  }, [activePosition?.market, activePosition?.symbol, selectedInterval, selectedRange]);

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
          `/api/market-data/stock-chart?symbol=${encodeURIComponent(activePosition.symbol)}&market=${encodeURIComponent(activePosition.market)}&range=${selectedRange}&interval=${selectedInterval}`,
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
          setHasLoadedOnce(true);
        }
      } catch (fetchError) {
        if (!cancelled) {
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
  }, [activePosition, selectedInterval, selectedRange]);

  const positive = (chart?.change ?? 0) >= 0;
  const chartOption = useMemo(() => {
    if (!chart) {
      return null;
    }

    const availableDates = new Set(chart.points.map((point) => point.date));
    const visibleMarkers = chartTransactions.filter((transaction) =>
      availableDates.has(transaction.tradeDate),
    );

    return buildChartOption(
      chart,
      visibleMarkers,
      activePosition?.avgCost ?? null,
      enabledIndicators,
    );
  }, [activePosition?.avgCost, chart, chartTransactions, enabledIndicators]);
  const latestVolume = chart?.points.at(-1)?.volume ?? 0;
  const chartEvents = useMemo(
    () => ({
      click: (params: { seriesType?: string; data?: { id?: string } }) => {
        if (params.seriesType !== "scatter") {
          return;
        }

        setSelectedMarkerId(params.data?.id ?? null);
      },
      updateAxisPointer: (params: {
        axesInfo?: Array<{ value?: string | number | Date }>;
        x?: number;
      }) => {
        if (typeof params.x === "number" && Number.isFinite(params.x)) {
          setSharedPointerX(params.x);
          return;
        }

        const value = params.axesInfo?.[0]?.value;
        const instance = chartRef.current;

        if (value === undefined || !instance) {
          setSharedPointerX(null);
          return;
        }

        try {
          const option = instance.getOption();
          const xAxisCount = Array.isArray(option.xAxis) ? option.xAxis.length : 1;
          const pixel = instance.convertToPixel(
            { xAxisIndex: Math.max(0, xAxisCount - 1) },
            value,
          );
          setSharedPointerX(typeof pixel === "number" ? pixel : null);
        } catch {
          setSharedPointerX(null);
        }
      },
      globalout: () => {
        setSharedPointerX(null);
      },
    }),
    [],
  );

  return (
    <Card className="module-card module-stock-price-chart flex h-full min-w-[500px] flex-col border-border/70">
      <CardHeader className="module-card-header module-stock-price-chart-header gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="module-stock-price-chart-interval-tabs flex items-center gap-1 rounded-lg border border-border/70 p-1">
              {CHART_INTERVALS.map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setSelectedInterval(interval)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                    selectedInterval === interval
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
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
                  {range === "all" ? "All" : range.toUpperCase()}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[36px] gap-2 border-border/70 bg-background px-3 text-sm"
                >
                  <SlidersHorizontal className="size-4" />
                  Indicators
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {(["rsi", "macd", "volume"] as IndicatorKey[]).map((indicator) => (
                  <DropdownMenuCheckboxItem
                    key={indicator}
                    checked={enabledIndicators.includes(indicator)}
                    onCheckedChange={(checked) =>
                      setEnabledIndicators((current) =>
                        checked
                          ? [...current.filter((value) => value !== indicator), indicator]
                          : current.filter((value) => value !== indicator),
                      )
                    }
                  >
                    {indicator === "rsi"
                      ? "RSI"
                      : indicator === "macd"
                        ? "MACD"
                        : "Volume"}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {chart ? (
          <div className="module-stock-price-chart-metrics flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <div className="text-3xl font-semibold tracking-tight text-foreground">
                {formatChartValue(chart.latestClose)}
              </div>
              <div className={positive ? "text-emerald-500" : "text-rose-500"}>
                {chart.change >= 0 ? "+" : ""}
                {formatChartValue(chart.change)} ({chart.changePercent >= 0 ? "+" : ""}
                {Math.abs(chart.changePercent).toFixed(2)}%)
              </div>
            </div>
            <div className="module-stock-price-chart-stats flex flex-wrap items-start justify-end gap-x-3 gap-y-2">
              <ChartStat
                label="1D High"
                value={chart.dayHigh}
                className="module-stock-price-chart-stat-day-high"
                labelClassName="module-stock-price-chart-stat-day-high-label"
                valueClassName="module-stock-price-chart-stat-day-high-value"
              />
              <ChartStat
                label="1D Low"
                value={chart.dayLow}
                className="module-stock-price-chart-stat-day-low"
                labelClassName="module-stock-price-chart-stat-day-low-label"
                valueClassName="module-stock-price-chart-stat-day-low-value"
              />
              <ChartStat
                label="52W High"
                value={chart.fiftyTwoWeekHigh}
                className="module-stock-price-chart-stat-fifty-two-week-high"
                labelClassName="module-stock-price-chart-stat-fifty-two-week-high-label"
                valueClassName="module-stock-price-chart-stat-fifty-two-week-high-value"
              />
              <ChartStat
                label="52W Low"
                value={chart.fiftyTwoWeekLow}
                className="module-stock-price-chart-stat-fifty-two-week-low"
                labelClassName="module-stock-price-chart-stat-fifty-two-week-low-label"
                valueClassName="module-stock-price-chart-stat-fifty-two-week-low-value"
              />
              <div className="module-stock-price-chart-stat module-stock-price-chart-stat-volume text-right">
                <div className="module-stock-price-chart-stat-label module-stock-price-chart-stat-volume-label text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Volume
                </div>
                <div className="module-stock-price-chart-stat-value module-stock-price-chart-stat-volume-value text-xs font-normal text-muted-foreground">
                  {formatVolume(latestVolume)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="module-stock-price-chart-content flex min-h-0 flex-1 flex-col pt-2">
        {positions.length === 0 ? (
          <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
            No positions available for charting yet.
          </div>
        ) : loading && !chart ? (
          <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
            Loading chart data...
          </div>
        ) : error && !chart ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
            {error}
          </div>
        ) : chart && chartOption ? (
          <div className="module-stock-price-chart-surface relative flex min-h-0 flex-1 flex-col rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{activePosition ? `${activePosition.symbol} · ${activePosition.market}` : ""}</span>
              <span>{chart.points.at(-1)?.date ? formatShortDate(chart.points.at(-1)?.date ?? "") : ""}</span>
            </div>
            <div className="relative min-h-[280px] flex-1">
              {sharedPointerX !== null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-white/40"
                  style={{ left: sharedPointerX, transform: "translateX(-0.5px)" }}
                />
              ) : null}
              <ReactECharts
                onChartReady={(instance) => {
                  chartRef.current = instance;
                }}
                option={chartOption}
                notMerge={false}
                replaceMerge={["series"]}
                lazyUpdate
                style={{ height: "100%", width: "100%" }}
                className="module-stock-price-chart-echarts"
                onEvents={chartEvents}
              />
            </div>
            {loading && hasLoadedOnce ? (
              <div className="absolute inset-4 flex items-center justify-center rounded-2xl bg-background/35 backdrop-blur-[1px]">
                <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                  Refreshing chart...
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
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
