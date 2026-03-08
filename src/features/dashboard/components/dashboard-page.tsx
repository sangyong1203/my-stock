import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardLayoutProvider } from "@/features/dashboard/components/dashboard-layout-provider";
import { DashboardSelectionProvider } from "@/features/dashboard/components/dashboard-selection-provider";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import type { DashboardPageModel } from "@/features/dashboard/types";
import { DashboardNewsProvider } from "@/features/market-data/components/dashboard-news-provider";
import { MarketPriceSyncProvider } from "@/features/market-data/components/market-price-sync-provider";

type Props = {
  model: DashboardPageModel;
};

export function DashboardPage({ model }: Props) {
  const symbols = Array.from(
    new Set(
      model.dashboard.positions
        .map((position) => position.symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const initialSecurity = model.dashboard.positions[0]
    ? {
        symbol: model.dashboard.positions[0].symbol,
        market: model.dashboard.positions[0].market,
      }
    : null;

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex w-full flex-1 flex-col gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <DashboardLayoutProvider
          key={model.syncStorageScope}
          storageScope={model.syncStorageScope}
          defaultLayout={model.initialLayout}
        >
          <MarketPriceSyncProvider storageScope={model.syncStorageScope}>
            <DashboardNewsProvider symbols={symbols}>
              <DashboardSelectionProvider initialSecurity={initialSecurity}>
                <DashboardHeader model={model} />
                <DashboardWorkspace model={model} />
              </DashboardSelectionProvider>
            </DashboardNewsProvider>
          </MarketPriceSyncProvider>
        </DashboardLayoutProvider>
      </div>
    </main>
  );
}
