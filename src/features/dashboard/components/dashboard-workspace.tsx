"use client";

import { useMemo, useRef, useState, type PointerEventHandler } from "react";
import { useDashboardLayout } from "@/features/dashboard/components/dashboard-layout-provider";
import {
  dashboardModuleRegistry,
  getDashboardModuleWidthBounds,
  getDashboardModuleWidthPx,
} from "@/features/dashboard/registry";
import type { DashboardPageModel } from "@/features/dashboard/types";

type Props = {
  model: DashboardPageModel;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type WorkspaceModuleProps = {
  moduleId: string;
  widthValue: string | undefined;
  model: DashboardPageModel;
};

function WorkspaceModule({ moduleId, widthValue, model }: WorkspaceModuleProps) {
  const { setModuleWidth } = useDashboardLayout();
  const [isResizing, setIsResizing] = useState(false);
  const pointerSessionRef = useRef<{
    startX: number;
    startWidth: number;
    min: number;
    max: number;
    lastAppliedWidth: number;
  } | null>(null);
  const entry = dashboardModuleRegistry[moduleId];

  const widthPx = useMemo(
    () => getDashboardModuleWidthPx(moduleId, widthValue),
    [moduleId, widthValue],
  );
  const widthBounds = useMemo(
    () => getDashboardModuleWidthBounds(moduleId),
    [moduleId],
  );

  if (!entry) {
    return null;
  }

  const Component = entry.component;

  const onResizeHandlePointerDown: PointerEventHandler<HTMLButtonElement> = (
    event,
  ) => {
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
      lastAppliedWidth: nextWidth,
    };
    setIsResizing(true);

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
      const candidate = clamp(
        session.startWidth + deltaX,
        session.min,
        session.max,
      );
      const rounded = Math.round(candidate);

      if (rounded === session.lastAppliedWidth) {
        return;
      }

      session.lastAppliedWidth = rounded;
      setModuleWidth(moduleId, `custom:${rounded}`);
    };

    const onPointerUp = () => {
      pointerSessionRef.current = null;
      setIsResizing(false);
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
      className={`dashboard-workspace-module dashboard-workspace-module-${entry.id} relative shrink-0 self-stretch`}
      style={{
        width: `${widthPx}px`,
        minWidth: `${widthPx}px`,
      }}
    >
      <Component model={model} />
      <button
        type="button"
        aria-label={`Resize ${entry.title}`}
        onPointerDown={onResizeHandlePointerDown}
        className={`dashboard-module-resize-handle absolute right-0 top-0 z-10 h-full w-3 translate-x-1/2 cursor-col-resize touch-none rounded-r-md border-l border-transparent bg-transparent transition-colors ${
          isResizing ? "border-primary/60 bg-primary/15" : "hover:border-border/80 hover:bg-muted/30"
        }`}
      >
        <span className="sr-only">{`Resize ${entry.title}`}</span>
        <svg
          viewBox="0 0 12 24"
          aria-hidden
          className="pointer-events-none mx-auto h-5 w-2 text-muted-foreground/70"
          fill="none"
        >
          <path
            d="M6 2.5V21.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

function renderModules(
  moduleIds: string[],
  widths: Record<string, string>,
  model: DashboardPageModel,
) {
  return moduleIds.map((moduleId) => (
    <WorkspaceModule
      key={moduleId}
      moduleId={moduleId}
      widthValue={widths[moduleId]}
      model={model}
    />
  ));
}

export function DashboardWorkspace({ model }: Props) {
  const { layout } = useDashboardLayout();

  return (
    <section className="dashboard-workspace flex h-full flex-1 overflow-x-auto pb-2">
      <div className="dashboard-workspace-track flex h-full min-w-max items-stretch gap-4 pr-1">
        {renderModules(layout.workspace, layout.widths, model)}
      </div>
    </section>
  );
}
