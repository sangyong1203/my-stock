"use client";

import { useDashboardLayout } from "@/features/dashboard/components/dashboard-layout-provider";
import {
  dashboardModuleRegistry,
  getDashboardModuleWidthClass,
} from "@/features/dashboard/registry";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

function renderModules(
  moduleIds: string[],
  widths: Record<string, string>,
  model: DashboardPageModel,
) {
  return moduleIds.map((moduleId) => {
    const entry = dashboardModuleRegistry[moduleId];
    if (!entry) {
      return null;
    }

    const Component = entry.component;
    return (
      <div
        key={entry.id}
        className={`shrink-0 ${getDashboardModuleWidthClass(moduleId, widths[moduleId])}`}
      >
        <Component model={model} />
      </div>
    );
  });
}

export function DashboardWorkspace({ model }: Props) {
  const { layout } = useDashboardLayout();

  return (
    <section className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-4">
        {renderModules(layout.workspace, layout.widths, model)}
      </div>
    </section>
  );
}
