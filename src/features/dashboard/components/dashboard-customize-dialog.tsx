"use client";

import { GripVertical, LayoutGrid, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

const SIDEBAR_AREAS: Array<Exclude<DashboardArea, "workspace">> = [
  "summary",
  "summaryHidden",
];

const AREA_LABELS: Record<Exclude<DashboardArea, "workspace">, string> = {
  summary: "Summary Row",
  summaryHidden: "Summary Hidden",
  workspaceHidden: "Workspace Hidden",
};

type DragState =
  | {
      moduleId: string;
      fromArea: Exclude<DashboardArea, "workspace"> | "workspacePanel";
      fromPanelId?: string;
    }
  | null;

type DragSourceArea = Exclude<DashboardArea, "workspace"> | "workspacePanel";

type ModuleCardProps = {
  moduleId: string;
  dragState: DragState;
  onStartDrag: (moduleId: string, fromArea: DragSourceArea, fromPanelId?: string) => void;
  onClearDrag: () => void;
  onDropBeforeModule: (
    target:
      | { type: "flat"; area: Exclude<DashboardArea, "workspace">; targetModuleId: string }
      | { type: "panel"; panelId: string; targetModuleId: string },
  ) => void;
  sourceArea: Exclude<DashboardArea, "workspace"> | "workspacePanel";
  sourcePanelId?: string;
};

function ModuleCard({
  moduleId,
  dragState,
  onStartDrag,
  onClearDrag,
  onDropBeforeModule,
  sourceArea,
  sourcePanelId,
}: ModuleCardProps) {
  const { layout, setModuleWidth } = useDashboardLayout();
  const moduleDefinition = dashboardModuleRegistry[moduleId];

  if (!moduleDefinition) {
    return null;
  }

  const isDragging = dragState?.moduleId === moduleId;
  const showWidthControls = sourceArea !== "workspacePanel";

  return (
    <div
      data-module-id={moduleId}
      className={`rounded-lg border border-border/70 bg-muted/20 p-3 transition ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", moduleId);
        onStartDrag(moduleId, sourceArea, sourcePanelId);
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
        if (sourceArea === "workspacePanel" && sourcePanelId) {
          onDropBeforeModule({
            type: "panel",
            panelId: sourcePanelId,
            targetModuleId: moduleId,
          });
          return;
        }

        if (sourceArea !== "workspacePanel") {
          onDropBeforeModule({
            type: "flat",
            area: sourceArea,
            targetModuleId: moduleId,
          });
        }
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
      {showWidthControls ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Width</div>
          <div className="flex gap-1">
            {moduleDefinition.widthPresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant={layout.widths[moduleId] === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => setModuleWidth(moduleId, preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type FlatAreaColumnProps = {
  area: Exclude<DashboardArea, "workspace">;
  dragState: DragState;
  onStartDrag: (moduleId: string, fromArea: DragSourceArea, fromPanelId?: string) => void;
  onDropToArea: (area: Exclude<DashboardArea, "workspace">) => void;
  onDropBeforeModule: (
    target:
      | { type: "flat"; area: Exclude<DashboardArea, "workspace">; targetModuleId: string }
      | { type: "panel"; panelId: string; targetModuleId: string },
  ) => void;
  onClearDrag: () => void;
};

function FlatAreaColumn({
  area,
  dragState,
  onStartDrag,
  onDropToArea,
  onDropBeforeModule,
  onClearDrag,
}: FlatAreaColumnProps) {
  const { layout } = useDashboardLayout();
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
          moduleIds.map((moduleId) => (
            <ModuleCard
              key={moduleId}
              moduleId={moduleId}
              dragState={dragState}
              onStartDrag={onStartDrag}
              onClearDrag={onClearDrag}
              onDropBeforeModule={onDropBeforeModule}
              sourceArea={area}
            />
          ))
        )}
      </div>
    </div>
  );
}

type WorkspacePanelBoardProps = {
  dragState: DragState;
  onStartDrag: (moduleId: string, fromArea: DragSourceArea, fromPanelId?: string) => void;
  onDropToPanel: (panelId: string) => void;
  onDropBeforeModule: (
    target:
      | { type: "flat"; area: Exclude<DashboardArea, "workspace">; targetModuleId: string }
      | { type: "panel"; panelId: string; targetModuleId: string },
  ) => void;
  onClearDrag: () => void;
};

function WorkspacePanelBoard({
  dragState,
  onStartDrag,
  onDropToPanel,
  onDropBeforeModule,
  onClearDrag,
}: WorkspacePanelBoardProps) {
  const { layout, createWorkspacePanel, removeWorkspacePanel } = useDashboardLayout();

  return (
    <div className="space-y-3 rounded-xl border border-border/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Workspace Panels</div>
          <div className="text-xs text-muted-foreground">
            Group 1 to 3 modules vertically inside each panel.
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={createWorkspacePanel}>
          <Plus className="size-4" />
          New Panel
        </Button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3">
          {layout.workspacePanels.map((panel, index) => (
            <div
              key={panel.id}
              className="flex w-[280px] min-w-[280px] flex-col rounded-xl border border-border/70 bg-background/60"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDropToPanel(panel.id);
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{`Panel ${index + 1}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {`${panel.moduleIds.length}/3 modules`}
                  </div>
                </div>
                {panel.moduleIds.length === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeWorkspacePanel(panel.id)}
                    aria-label="Remove empty panel"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="min-h-44 space-y-2 p-2">
                {panel.moduleIds.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/50 px-4 text-center text-sm text-muted-foreground">
                    Drop modules here.
                  </div>
                ) : (
                  panel.moduleIds.map((moduleId) => (
                    <ModuleCard
                      key={moduleId}
                      moduleId={moduleId}
                      dragState={dragState}
                      onStartDrag={onStartDrag}
                      onClearDrag={onClearDrag}
                      onDropBeforeModule={onDropBeforeModule}
                      sourceArea="workspacePanel"
                      sourcePanelId={panel.id}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
          {layout.workspacePanels.length === 0 ? (
            <div className="flex h-44 w-[280px] min-w-[280px] items-center justify-center rounded-xl border border-dashed border-border/50 px-4 text-center text-sm text-muted-foreground">
              Create a panel, then drag workspace modules into it.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DashboardCustomizeDialog() {
  const { layout, resetLayout, moveModule, moveWorkspaceModule } = useDashboardLayout();
  const [open, setOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);

  const onStartDrag = (
    moduleId: string,
    fromArea: DragSourceArea,
    fromPanelId?: string,
  ) => {
    setDragState({ moduleId, fromArea, fromPanelId });
  };

  const onDropBeforeModule = (
    target:
      | { type: "flat"; area: Exclude<DashboardArea, "workspace">; targetModuleId: string }
      | { type: "panel"; panelId: string; targetModuleId: string },
  ) => {
    if (!dragState) {
      return;
    }

    if (dragState.moduleId === target.targetModuleId) {
      setDragState(null);
      return;
    }

    if (target.type === "flat") {
      moveModule(dragState.moduleId, target.area, target.targetModuleId);
      setDragState(null);
      return;
    }

    const moved = moveWorkspaceModule(
      dragState.moduleId,
      target.panelId,
      target.targetModuleId,
    );

    if (!moved) {
      toast.error("Each panel can hold up to 3 modules.");
      return;
    }

    setDragState(null);
  };

  const onDropToArea = (area: Exclude<DashboardArea, "workspace">) => {
    if (!dragState) {
      return;
    }

    const currentAreaModules = layout[area];
    const isAlreadyLastInArea =
      dragState.fromArea === area &&
      currentAreaModules[currentAreaModules.length - 1] === dragState.moduleId;

    if (isAlreadyLastInArea) {
      setDragState(null);
      return;
    }

    moveModule(dragState.moduleId, area);
    setDragState(null);
  };

  const onDropToPanel = (panelId: string) => {
    if (!dragState) {
      return;
    }

    const moved = moveWorkspaceModule(dragState.moduleId, panelId);
    if (!moved) {
      toast.error("Each panel can hold up to 3 modules.");
      return;
    }

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Drag modules into bordered workspace panels. Each panel can stack up to 3 modules vertically and can be resized from the dashboard workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
          <WorkspacePanelBoard
            dragState={dragState}
            onStartDrag={onStartDrag}
            onDropToPanel={onDropToPanel}
            onDropBeforeModule={onDropBeforeModule}
            onClearDrag={() => setDragState(null)}
          />
          <div className="space-y-4">
            <FlatAreaColumn
              area="workspaceHidden"
              dragState={dragState}
              onStartDrag={onStartDrag}
              onDropToArea={onDropToArea}
              onDropBeforeModule={onDropBeforeModule}
              onClearDrag={() => setDragState(null)}
            />
            {SIDEBAR_AREAS.map((area) => (
              <FlatAreaColumn
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
