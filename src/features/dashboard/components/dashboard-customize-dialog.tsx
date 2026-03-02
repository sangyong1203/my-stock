"use client";

import Sortable from "sortablejs";
import { GripVertical, LayoutGrid, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const CUSTOMIZABLE_AREAS: DashboardArea[] = ["workspace", "hidden"];

const AREA_LABELS: Record<DashboardArea, string> = {
  workspace: "Workspace Row",
  hidden: "Hidden",
  summary: "Summary Row",
};

type AreaColumnProps = {
  area: DashboardArea;
  setAreaRef: (area: DashboardArea, element: HTMLDivElement | null) => void;
};

function AreaColumn({ area, setAreaRef }: AreaColumnProps) {
  const { layout, moveToArea, setModuleWidth } = useDashboardLayout();
  const moduleIds = layout[area];

  return (
    <div className="space-y-3 rounded-xl border border-border/70 p-4">
      <div className="text-sm font-medium">{AREA_LABELS[area]}</div>
      <div ref={(element) => setAreaRef(area, element)} className="space-y-2">
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
                data-id={moduleId}
                data-module-id={moduleId}
                className="rounded-lg border border-border/70 bg-muted/20 p-3"
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
                  <div className="text-xs text-muted-foreground">Drag to reorder</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
  const { resetLayout, setAreaModules } = useDashboardLayout();
  const areaRefs = useRef<Partial<Record<DashboardArea, HTMLDivElement | null>>>({});
  const sortableRefs = useRef<Sortable[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const syncAreaOrders = () => {
      for (const area of CUSTOMIZABLE_AREAS) {
        const sortable = sortableRefs.current.find(
          (instance) => instance.el === areaRefs.current[area],
        );
        if (!sortable) {
          continue;
        }

        setAreaModules(area, sortable.toArray());
      }
    };

    let cancelled = false;
    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      sortableRefs.current = CUSTOMIZABLE_AREAS.flatMap((area) => {
        const container = areaRefs.current[area];
        if (!container) {
          return [];
        }

        return [
          Sortable.create(container, {
            group: "dashboard-modules",
            sort: true,
            animation: 160,
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 4,
            handle: ".module-sort-handle",
            draggable: "[data-module-id]",
            dataIdAttr: "data-id",
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            dragClass: "sortable-drag",
            onEnd: syncAreaOrders,
            onAdd: syncAreaOrders,
            onUpdate: syncAreaOrders,
          }),
        ];
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      for (const sortable of sortableRefs.current) {
        sortable.destroy();
      }
      sortableRefs.current = [];
    };
  }, [open, setAreaModules]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Reorder workspace modules, adjust widths, hide modules, and keep the layout in local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          <AreaColumn
            area="workspace"
            setAreaRef={(area, element) => {
              areaRefs.current[area] = element;
            }}
          />
          <AreaColumn
            area="hidden"
            setAreaRef={(area, element) => {
              areaRefs.current[area] = element;
            }}
          />
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
