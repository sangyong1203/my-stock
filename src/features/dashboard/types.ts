import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data";

export type DashboardSummary = {
  marketValue: number;
  invested: number;
  unrealizedPnl: number;
  returnRate: number;
};

export type DashboardPageModel = {
  dashboard: DashboardData;
  isAuthenticated: boolean;
  displayName: string | null;
  syncStorageScope: string;
  summaries: DashboardSummary;
  initialLayout: DashboardLayoutState;
};

export type DashboardModuleProps = {
  model: DashboardPageModel;
};

export type DashboardArea = "summary" | "workspace" | "hidden";

export type DashboardLayoutState = {
  summary: string[];
  workspace: string[];
  hidden: string[];
  widths: Record<string, string>;
};

export type DashboardWidthPreset = {
  id: string;
  label: string;
  className: string;
};

export type DashboardModuleDefinition = {
  id: string;
  title: string;
  component: (props: DashboardModuleProps) => React.JSX.Element;
  defaultWidthPreset: string;
  widthPresets: DashboardWidthPreset[];
};

