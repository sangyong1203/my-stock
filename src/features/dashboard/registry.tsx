import type {
  DashboardLayoutState,
  DashboardModuleDefinition,
  DashboardWorkspacePanel,
} from "@/features/dashboard/types";
import {
  MarketIndexesModule,
  NewsModule,
  NextBuildStepsModule,
  OpenPositionsModule,
  PnlSummaryModule,
  RecentTransactionsModule,
  StockFilterModule,
  StockPriceChartModule,
  TotalMarketValueModule,
  WatchlistModule,
} from "@/features/dashboard/modules";

export const dashboardModuleRegistry: Record<string, DashboardModuleDefinition> = {
  "market-indexes": {
    id: "market-indexes",
    title: "Market Indexes",
    component: MarketIndexesModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[560px] min-w-[560px]" },
      { id: "md", label: "M", className: "w-[640px] min-w-[640px]" },
      { id: "lg", label: "L", className: "w-[760px] min-w-[760px]" },
    ],
  },
  "total-market-value": {
    id: "total-market-value",
    title: "Total Market Value",
    component: TotalMarketValueModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[220px] min-w-[220px]" },
      { id: "md", label: "M", className: "w-[250px] min-w-[250px]" },
      { id: "lg", label: "L", className: "w-[290px] min-w-[290px]" },
    ],
  },
  "pnl-summary": {
    id: "pnl-summary",
    title: "P/L Summary",
    component: PnlSummaryModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[280px] min-w-[280px]" },
      { id: "md", label: "M", className: "w-[320px] min-w-[320px]" },
      { id: "lg", label: "L", className: "w-[360px] min-w-[360px]" },
    ],
  },
  "open-positions": {
    id: "open-positions",
    title: "Open Positions",
    component: OpenPositionsModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[760px] min-w-[760px]" },
      { id: "md", label: "M", className: "w-[980px] min-w-[980px]" },
      { id: "lg", label: "L", className: "w-[1220px] min-w-[1220px]" },
    ],
  },
  "recent-transactions": {
    id: "recent-transactions",
    title: "Recent Transactions",
    component: RecentTransactionsModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[320px] min-w-[320px]" },
      { id: "md", label: "M", className: "w-[380px] min-w-[380px]" },
      { id: "lg", label: "L", className: "w-[460px] min-w-[460px]" },
    ],
  },
  "stock-price-chart": {
    id: "stock-price-chart",
    title: "Stock Price Chart",
    component: StockPriceChartModule,
    defaultWidthPreset: "md",
    resizeMinWidthPx: 800,
    widthPresets: [
      { id: "sm", label: "S", className: "w-[520px] min-w-[520px]" },
      { id: "md", label: "M", className: "w-[680px] min-w-[680px]" },
      { id: "lg", label: "L", className: "w-[860px] min-w-[860px]" },
    ],
  },
  "stock-filter": {
    id: "stock-filter",
    title: "Stock Filter",
    component: StockFilterModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[820px] min-w-[820px]" },
      { id: "md", label: "M", className: "w-[980px] min-w-[980px]" },
      { id: "lg", label: "L", className: "w-[1180px] min-w-[1180px]" },
    ],
  },
  "next-build-steps": {
    id: "next-build-steps",
    title: "Next Build Steps",
    component: NextBuildStepsModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[320px] min-w-[320px]" },
      { id: "md", label: "M", className: "w-[380px] min-w-[380px]" },
      { id: "lg", label: "L", className: "w-[460px] min-w-[460px]" },
    ],
  },
  news: {
    id: "news",
    title: "News",
    component: NewsModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[320px] min-w-[320px]" },
      { id: "md", label: "M", className: "w-[420px] min-w-[420px]" },
      { id: "lg", label: "L", className: "w-[540px] min-w-[540px]" },
    ],
  },
  watchlist: {
    id: "watchlist",
    title: "Watch List",
    component: WatchlistModule,
    defaultWidthPreset: "md",
    widthPresets: [
      { id: "sm", label: "S", className: "w-[320px] min-w-[320px]" },
      { id: "md", label: "M", className: "w-[420px] min-w-[420px]" },
      { id: "lg", label: "L", className: "w-[520px] min-w-[520px]" },
    ],
  },
};

// Add a module component above, then place its id into any area below.
const dashboardModuleOrder = {
  summary: [
    "market-indexes",
    "total-market-value",
    "pnl-summary",
  ],
  summaryHidden: [],
  workspace: [
    "open-positions",
    "stock-price-chart",
    "stock-filter",
    "news",
    "watchlist",
    "recent-transactions",
    "next-build-steps",
  ],
  workspaceHidden: [],
} as const;

export function createDefaultDashboardLayout(): DashboardLayoutState {
  const workspacePanels: DashboardWorkspacePanel[] = dashboardModuleOrder.workspace.map(
    (moduleId, index) => ({
      id: `workspace-panel-${index + 1}`,
      moduleIds: [moduleId],
    }),
  );

  return {
    summary: [...dashboardModuleOrder.summary],
    summaryHidden: [...dashboardModuleOrder.summaryHidden],
    workspacePanels,
    workspaceHidden: [...dashboardModuleOrder.workspaceHidden],
    widths: Object.fromEntries(
      Object.values(dashboardModuleRegistry).map((module) => [
        module.id,
        module.defaultWidthPreset,
      ]),
    ),
    panelWidths: {},
  };
}

function getPresetWidthPx(className: string) {
  const match = className.match(/w-\[(\d+)px\]/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCustomWidth(widthPresetId: string | undefined) {
  if (!widthPresetId || !widthPresetId.startsWith("custom:")) {
    return null;
  }

  const parsed = Number(widthPresetId.slice("custom:".length));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

export function getDashboardModuleWidthBounds(moduleId: string) {
  const moduleDefinition = dashboardModuleRegistry[moduleId];
  if (!moduleDefinition) {
    return { min: 280, max: 1400 };
  }

  const presetWidths = moduleDefinition.widthPresets
    .map((preset) => getPresetWidthPx(preset.className))
    .filter((value): value is number => value !== null);

  if (presetWidths.length === 0) {
    return { min: 280, max: 1400 };
  }

  const minPreset = Math.min(...presetWidths);
  const maxPreset = Math.max(...presetWidths);

  return {
    min: moduleDefinition.resizeMinWidthPx ?? Math.max(220, minPreset - 120),
    max: moduleDefinition.resizeMaxWidthPx ?? maxPreset + 420,
  };
}

export function getDashboardModuleWidthPx(
  moduleId: string,
  widthPresetId: string | undefined,
) {
  const customWidth = parseCustomWidth(widthPresetId);
  if (customWidth !== null) {
    return customWidth;
  }

  const moduleDefinition = dashboardModuleRegistry[moduleId];
  if (!moduleDefinition) {
    return 360;
  }

  const matched =
    moduleDefinition.widthPresets.find((preset) => preset.id === widthPresetId) ??
    moduleDefinition.widthPresets.find(
      (preset) => preset.id === moduleDefinition.defaultWidthPreset,
    ) ??
    moduleDefinition.widthPresets[0];

  const presetWidth = matched ? getPresetWidthPx(matched.className) : null;
  return presetWidth ?? 360;
}

export function getDashboardWorkspacePanelWidthPx(
  panel: DashboardWorkspacePanel,
  panelWidthValue: string | undefined,
  moduleWidths: Record<string, string>,
) {
  const bounds = getDashboardWorkspacePanelWidthBounds(panel, moduleWidths);
  const customWidth = parseCustomWidth(panelWidthValue);
  if (customWidth !== null) {
    return Math.max(bounds.min, Math.min(bounds.max, customWidth));
  }

  const moduleWidthsPx = panel.moduleIds.map((moduleId) =>
    getDashboardModuleWidthPx(moduleId, moduleWidths[moduleId]),
  );

  if (moduleWidthsPx.length === 0) {
    return Math.max(bounds.min, Math.min(bounds.max, 420));
  }

  return Math.max(bounds.min, ...moduleWidthsPx);
}

export function getDashboardWorkspacePanelWidthBounds(
  panel: DashboardWorkspacePanel,
  moduleWidths: Record<string, string>,
) {
  const moduleBounds = panel.moduleIds.map((moduleId) =>
    getDashboardModuleWidthBounds(moduleId),
  );

  if (moduleBounds.length === 0) {
    return { min: 320, max: 1600 };
  }

  return {
    min: Math.max(280, Math.max(...moduleBounds.map((bounds) => bounds.min))),
    max: Math.max(...moduleBounds.map((bounds) => bounds.max)),
  };
}
