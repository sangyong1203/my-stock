import type { Session } from "next-auth";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data";
import type {
  DashboardLayoutState,
  DashboardPageModel,
} from "@/features/dashboard/types";

export function buildDashboardPageModel(
  dashboard: DashboardData,
  session: Session | null,
  initialLayout: DashboardLayoutState,
): DashboardPageModel {
  const positions = dashboard.positions;
  const marketValue = positions.reduce(
    (sum, item) => sum + item.quantity * item.currentPrice,
    0,
  );
  const invested = positions.reduce(
    (sum, item) => sum + item.quantity * item.avgCost,
    0,
  );
  const unrealizedPnl = marketValue - invested;
  const returnRate = invested === 0 ? 0 : (unrealizedPnl / invested) * 100;

  return {
    dashboard,
    isAuthenticated: Boolean(session?.user?.id),
    displayName: session?.user?.name ?? session?.user?.email ?? null,
    syncStorageScope: session?.user?.id ?? "anonymous",
    initialLayout,
    summaries: {
      marketValue,
      invested,
      unrealizedPnl,
      returnRate,
    },
  };
}

