import type {
  DashboardLayoutState,
  DashboardModuleDefinition,
} from "@/features/dashboard/types";
import {
  NextBuildStepsModule,
  OpenPositionsModule,
  RecentTransactionsModule,
} from "@/features/dashboard/modules/panel-modules";
import {
  PnlSummaryModule,
  TotalMarketValueModule,
} from "@/features/dashboard/modules/summary-modules";

export const dashboardModuleRegistry: Record<string, DashboardModuleDefinition> = {
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
};

// Add a module component above, then place its id into any area below.
const dashboardModuleOrder = {
  summary: [
    "total-market-value",
    "pnl-summary",
  ],
  workspace: ["open-positions", "recent-transactions", "next-build-steps"],
  hidden: [],
} as const;

export const dashboardSummaryModuleIds = [...dashboardModuleOrder.summary];

export function createDefaultDashboardLayout(): DashboardLayoutState {
  return {
    summary: [...dashboardModuleOrder.summary],
    workspace: [...dashboardModuleOrder.workspace],
    hidden: [...dashboardModuleOrder.hidden],
    widths: Object.fromEntries(
      Object.values(dashboardModuleRegistry).map((module) => [
        module.id,
        module.defaultWidthPreset,
      ]),
    ),
  };
}

export function getDashboardModuleWidthClass(
  moduleId: string,
  widthPresetId: string | undefined,
) {
  const moduleDefinition = dashboardModuleRegistry[moduleId];
  if (!moduleDefinition) {
    return "w-[360px] min-w-[360px]";
  }

  const matched =
    moduleDefinition.widthPresets.find((preset) => preset.id === widthPresetId) ??
    moduleDefinition.widthPresets.find(
      (preset) => preset.id === moduleDefinition.defaultWidthPreset,
    ) ??
    moduleDefinition.widthPresets[0];

  return matched?.className ?? "w-[360px] min-w-[360px]";
}
