"use client";

import { GripVertical, LayoutGrid, RotateCcw } from "lucide-react";
import { useState } from "react";
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

const CUSTOMIZABLE_AREAS: DashboardArea[] = [
  "summary",
  "summaryHidden",
  "workspace",
  "workspaceHidden",
];

const AREA_LABELS: Record<DashboardArea, string> = {
  summary: "Summary Row",
  summaryHidden: "Summary Hidden",
  workspace: "Workspace Row",
  workspaceHidden: "Workspace Hidden",
};

type DragState = {
  moduleId: string;
  fromArea: DashboardArea;
} | null;

type AreaColumnProps = {
  area: DashboardArea;
  dragState: DragState;
  onStartDrag: (moduleId: string, fromArea: DashboardArea) => void;
  onDropToArea: (targetArea: DashboardArea) => void;
  onDropBeforeModule: (targetArea: DashboardArea, targetModuleId: string) => void;
  onClearDrag: () => void;
};

function AreaColumn({
  area,
  dragState,
  onStartDrag,
  onDropToArea,
  onDropBeforeModule,
  onClearDrag,
}: AreaColumnProps) {
  const { layout, setModuleWidth } = useDashboardLayout();
  const moduleIds = layout[area];

  return (
    <div className="space-y-3 rounded-xl border border-border/70 p-4">
      <div className="text-sm font-medium">{AREA_LABELS[area]}</div>
      <div
        className="min-h-24 space-y-2 rounded-lg border border-dashed border-border/50 p-2"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropToArea(area);
        }}
      >
        {moduleIds.length === 0 ? (
          <div className="rounded-lg px-3 py-6 text-center text-sm text-muted-foreground">
            Drag modules here.
          </div>
        ) : (
          moduleIds.map((moduleId) => {
            const moduleDefinition = dashboardModuleRegistry[moduleId];
            if (!moduleDefinition) {
              return null;
            }

            const isDragging = dragState?.moduleId === moduleId;

            return (
              <div
                key={moduleId}
                data-module-id={moduleId}
                className={`rounded-lg border border-border/70 bg-muted/20 p-3 transition ${
                  isDragging ? "opacity-40" : "opacity-100"
                }`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", moduleId);
                  onStartDrag(moduleId, area);
                }}
                onDragEnd={() => {
                  window.setTimeout(onClearDrag, 0);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDropBeforeModule(area, moduleId);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="module-sort-handle cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
                      aria-label={`Reorder ${moduleDefinition.title}`}
                      role="button"
                      tabIndex={0}
                    >
                      <GripVertical className="size-4" />
                    </div>
                    <div className="text-sm font-medium">{moduleDefinition.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Drag to move</div>
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
  const { layout, resetLayout, moveModule } = useDashboardLayout();
  const [open, setOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);

  const onStartDrag = (moduleId: string, fromArea: DashboardArea) => {
    setDragState({ moduleId, fromArea });
  };

  const onDropBeforeModule = (targetArea: DashboardArea, targetModuleId: string) => {
    if (!dragState) {
      return;
    }

    if (dragState.moduleId === targetModuleId) {
      setDragState(null);
      return;
    }

    moveModule(dragState.moduleId, targetArea, targetModuleId);
    setDragState(null);
  };

  const onDropToArea = (targetArea: DashboardArea) => {
    if (!dragState) {
      return;
    }

    const currentAreaModules = layout[targetArea];
    const isAlreadyLastInArea =
      dragState.fromArea === targetArea &&
      currentAreaModules[currentAreaModules.length - 1] === dragState.moduleId;

    if (isAlreadyLastInArea) {
      setDragState(null);
      return;
    }

    moveModule(dragState.moduleId, targetArea);
    setDragState(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
          <LayoutGrid className="size-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Drag modules across Summary/Workspace and their own hidden lists, then reorder and resize.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          {CUSTOMIZABLE_AREAS.map((area) => (
            <AreaColumn
              key={area}
              area={area}
              dragState={dragState}
              onStartDrag={onStartDrag}
              onDropToArea={onDropToArea}
              onDropBeforeModule={onDropBeforeModule}
              onClearDrag={() => setDragState(null)}
            />
          ))}
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
