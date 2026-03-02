import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardLayoutProvider } from "@/features/dashboard/components/dashboard-layout-provider";
import { DashboardSelectionProvider } from "@/features/dashboard/components/dashboard-selection-provider";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

export function DashboardPage({ model }: Props) {
  const initialSecurity = model.dashboard.positions[0]
    ? {
        symbol: model.dashboard.positions[0].symbol,
        market: model.dashboard.positions[0].market,
      }
    : null;

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardLayoutProvider
          key={model.syncStorageScope}
          storageScope={model.syncStorageScope}
          defaultLayout={model.initialLayout}
        >
          <DashboardSelectionProvider initialSecurity={initialSecurity}>
            <DashboardHeader model={model} />
            <DashboardWorkspace model={model} />
          </DashboardSelectionProvider>
        </DashboardLayoutProvider>
      </div>
    </main>
  );
}
