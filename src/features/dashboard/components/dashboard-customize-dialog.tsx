"use client";

import { LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDashboardLayout } from "@/features/dashboard/components/dashboard-layout-provider";
import { dashboardModuleRegistry } from "@/features/dashboard/registry";
import type { DashboardArea } from "@/features/dashboard/types";

const AREA_LABELS: Record<DashboardArea, string> = {
  summary: "Summary Row",
  workspace: "Workspace Row",
  hidden: "Hidden",
};

type AreaColumnProps = {
  area: DashboardArea;
};

function AreaColumn({ area }: AreaColumnProps) {
  const { layout, moveModule, moveToArea, setModuleWidth } = useDashboardLayout();
  const moduleIds = layout[area];

  return (
    <div
      className="space-y-3 rounded-xl border border-border/70 p-4"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const moduleId = event.dataTransfer.getData("text/dashboard-module-id");
        if (!moduleId) {
          return;
        }
        moveModule(moduleId, area);
      }}
    >
      <div className="text-sm font-medium">{AREA_LABELS[area]}</div>
      <div className="space-y-2">
        {moduleIds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
            No modules in this area.
          </div>
        ) : (
          moduleIds.map((moduleId) => {
            const moduleDefinition = dashboardModuleRegistry[moduleId];
            if (!moduleDefinition) {
              return null;
            }

            return (
              <div
                key={moduleId}
                className="rounded-lg border border-border/70 bg-muted/20 p-3"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/dashboard-module-id", moduleId);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedModuleId = event.dataTransfer.getData(
                    "text/dashboard-module-id",
                  );
                  if (!draggedModuleId) {
                    return;
                  }
                  moveModule(draggedModuleId, area, moduleId);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{moduleDefinition.title}</div>
                  <div className="text-xs text-muted-foreground">Drag to reorder</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {area !== "summary" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => moveToArea(moduleId, "summary")}
                    >
                      Move to Summary
                    </Button>
                  ) : null}
                  {area !== "workspace" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => moveToArea(moduleId, "workspace")}
                    >
                      Move to Workspace
                    </Button>
                  ) : null}
                  {area !== "hidden" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveToArea(moduleId, "hidden")}
                    >
                      Hide
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Width</div>
                  <div className="flex gap-1">
                    {moduleDefinition.widthPresets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={
                          layout.widths[moduleId] === preset.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setModuleWidth(moduleId, preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DashboardCustomizeDialog() {
  const { resetLayout } = useDashboardLayout();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
          <LayoutGrid className="size-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Move modules between rows, hide them, and keep the layout in local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-3">
          <AreaColumn area="summary" />
          <AreaColumn area="workspace" />
          <AreaColumn area="hidden" />
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={resetLayout}>
            <RotateCcw className="size-4" />
            Reset Layout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
