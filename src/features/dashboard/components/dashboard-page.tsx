import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardLayoutProvider } from "@/features/dashboard/components/dashboard-layout-provider";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

export function DashboardPage({ model }: Props) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardLayoutProvider
          key={model.syncStorageScope}
          storageScope={model.syncStorageScope}
          defaultLayout={model.initialLayout}
        >
          <DashboardHeader model={model} />
          <DashboardWorkspace model={model} />
        </DashboardLayoutProvider>
      </div>
    </main>
  );
}
