"use client";

import { useMemo, useRef, useState, type PointerEventHandler } from "react";
import { useDashboardLayout } from "@/features/dashboard/components/dashboard-layout-provider";
import {
  dashboardModuleRegistry,
  getDashboardWorkspacePanelWidthBounds,
  getDashboardWorkspacePanelWidthPx,
} from "@/features/dashboard/registry";
import type {
  DashboardPageModel,
  DashboardWorkspacePanel,
} from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type WorkspacePanelProps = {
  panel: DashboardWorkspacePanel;
  model: DashboardPageModel;
};

function WorkspacePanel({ panel, model }: WorkspacePanelProps) {
  const { layout, setWorkspacePanelWidth } = useDashboardLayout();
  const [activeHandle, setActiveHandle] = useState<"left" | "right" | null>(null);
  const pointerSessionRef = useRef<{
    startX: number;
    startWidth: number;
    min: number;
    max: number;
    direction: "left" | "right";
    lastAppliedWidth: number;
  } | null>(null);

  const widthPx = useMemo(
    () => getDashboardWorkspacePanelWidthPx(panel, layout.panelWidths[panel.id], layout.widths),
    [layout.panelWidths, layout.widths, panel],
  );
  const widthBounds = useMemo(
    () => getDashboardWorkspacePanelWidthBounds(panel, layout.widths),
    [layout.widths, panel],
  );

  const onResizeHandlePointerDown =
    (direction: "left" | "right"): PointerEventHandler<HTMLButtonElement> =>
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextWidth = clamp(widthPx, widthBounds.min, widthBounds.max);

      pointerSessionRef.current = {
        startX: event.clientX,
        startWidth: nextWidth,
        min: widthBounds.min,
        max: widthBounds.max,
        direction,
        lastAppliedWidth: nextWidth,
      };
      setActiveHandle(direction);

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const session = pointerSessionRef.current;
        if (!session) {
          return;
        }

        const deltaX = moveEvent.clientX - session.startX;
        const signedDelta = session.direction === "right" ? deltaX : -deltaX;
        const candidate = clamp(
          session.startWidth + signedDelta,
          session.min,
          session.max,
        );
        const rounded = Math.round(candidate);

        if (rounded === session.lastAppliedWidth) {
          return;
        }

        session.lastAppliedWidth = rounded;
        setWorkspacePanelWidth(panel.id, `custom:${rounded}`);
      };

      const onPointerUp = () => {
        pointerSessionRef.current = null;
        setActiveHandle(null);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

  return (
    <div
      className="dashboard-workspace-panel group relative flex h-full shrink-0 self-stretch"
      style={{
        width: `${widthPx}px`,
        minWidth: `${widthPx}px`,
      }}
    >
      <button
        type="button"
        aria-label="Resize panel from left edge"
        onPointerDown={onResizeHandlePointerDown("left")}
        className={`absolute left-0 top-0 z-10 h-full w-3 -translate-x-1/2 cursor-col-resize touch-none rounded-l-md border-r border-transparent bg-transparent transition-colors ${
          activeHandle === "left"
            ? "border-primary/60 bg-primary/15"
            : "hover:border-border/80 hover:bg-muted/20"
        }`}
      />
      <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
        {panel.moduleIds.map((moduleId) => {
          const entry = dashboardModuleRegistry[moduleId];
          if (!entry) {
            return null;
          }

          const Component = entry.component;

          return (
            <div
              key={moduleId}
              className={`dashboard-workspace-panel-module flex min-h-0 flex-col ${
                panel.moduleIds.length === 1 ? "flex-1" : "flex-1"
              }`}
            >
              <Component model={model} />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Resize panel from right edge"
        onPointerDown={onResizeHandlePointerDown("right")}
        className={`absolute right-0 top-0 z-10 h-full w-3 translate-x-1/2 cursor-col-resize touch-none rounded-r-md border-l border-transparent bg-transparent transition-colors ${
          activeHandle === "right"
            ? "border-primary/60 bg-primary/15"
            : "hover:border-border/80 hover:bg-muted/20"
        }`}
      />
    </div>
  );
}

export function DashboardWorkspace({ model }: Props) {
  const { layout } = useDashboardLayout();
  const panels = layout.workspacePanels.filter((panel) => panel.moduleIds.length > 0);

  return (
    <section className="dashboard-workspace flex h-full flex-1 overflow-x-auto pb-2">
      <div className="dashboard-workspace-track flex h-full min-w-max items-stretch gap-4 pr-1">
        {panels.map((panel) => (
          <WorkspacePanel key={panel.id} panel={panel} model={model} />
        ))}
      </div>
    </section>
  );
}
