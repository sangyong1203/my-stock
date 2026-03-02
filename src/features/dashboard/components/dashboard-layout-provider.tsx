"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  DashboardArea,
  DashboardLayoutState,
} from "@/features/dashboard/types";
import { createDefaultDashboardLayout } from "@/features/dashboard/registry";

type DashboardLayoutContextValue = {
  layout: DashboardLayoutState;
  moveModule: (
    moduleId: string,
    nextArea: DashboardArea,
    targetModuleId?: string | null,
  ) => void;
  moveToArea: (moduleId: string, nextArea: DashboardArea) => void;
  setAreaModules: (area: DashboardArea, moduleIds: string[]) => void;
  setModuleWidth: (moduleId: string, widthPresetId: string) => void;
  resetLayout: () => void;
};

const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue | null>(null);

type Props = {
  children: ReactNode;
  storageScope: string;
  defaultLayout: DashboardLayoutState;
};

function sanitizeLayout(
  layout: DashboardLayoutState,
  defaultLayout: DashboardLayoutState,
) {
  const lockedSummaryIds = new Set(defaultLayout.summary);
  const allKnown = new Set([
    ...defaultLayout.summary,
    ...defaultLayout.workspace,
    ...defaultLayout.hidden,
  ]);

  const normalizeArea = (items: string[]) =>
    items.filter((item, index) => allKnown.has(item) && items.indexOf(item) === index);

  const next: DashboardLayoutState = {
    summary: [...defaultLayout.summary],
    workspace: normalizeArea(layout.workspace).filter(
      (item) => !lockedSummaryIds.has(item),
    ),
    hidden: normalizeArea(layout.hidden).filter((item) => !lockedSummaryIds.has(item)),
    widths:
      layout.widths && typeof layout.widths === "object" ? { ...layout.widths } : {},
  };

  for (const moduleId of allKnown) {
    if (
      !next.summary.includes(moduleId) &&
      !next.workspace.includes(moduleId) &&
      !next.hidden.includes(moduleId)
    ) {
      next.hidden.push(moduleId);
    }
  }

  return next;
}

function removeModule(layout: DashboardLayoutState, moduleId: string): DashboardLayoutState {
  return {
    summary: layout.summary.filter((item) => item !== moduleId),
    workspace: layout.workspace.filter((item) => item !== moduleId),
    hidden: layout.hidden.filter((item) => item !== moduleId),
    widths: { ...layout.widths },
  };
}

export function DashboardLayoutProvider({
  children,
  storageScope,
  defaultLayout,
}: Props) {
  const storageKey = `dashboard-layout:${storageScope}`;
  const [layout, setLayout] = useState<DashboardLayoutState>(defaultLayout);
  const hasHydratedRef = useRef(false);
  const lastSavedLayoutRef = useRef(JSON.stringify(defaultLayout));

  useEffect(() => {
    const fallback = sanitizeLayout(defaultLayout, createDefaultDashboardLayout());

    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setLayout(fallback);
        lastSavedLayoutRef.current = JSON.stringify(fallback);
        hasHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as DashboardLayoutState;
      const merged = sanitizeLayout(parsed, fallback);
      setLayout(merged);
      lastSavedLayoutRef.current = JSON.stringify(merged);
      hasHydratedRef.current = true;
    } catch {
      window.localStorage.removeItem(storageKey);
      setLayout(fallback);
      lastSavedLayoutRef.current = JSON.stringify(fallback);
      hasHydratedRef.current = true;
    }
  }, [defaultLayout, storageKey]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [layout, storageKey]);

  useEffect(() => {
    if (!hasHydratedRef.current || storageScope === "anonymous") {
      return;
    }

    const serialized = JSON.stringify(layout);
    if (serialized === lastSavedLayoutRef.current) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/dashboard/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ layout }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(data?.message || "Failed to save dashboard layout.");
        }

        lastSavedLayoutRef.current = serialized;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save dashboard layout.";
        toast.error(message);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [layout, storageScope]);

  const value = useMemo<DashboardLayoutContextValue>(
    () => ({
      layout,
      moveModule(moduleId, nextArea, targetModuleId) {
        setLayout((current) => {
          const cleared = removeModule(current, moduleId);
          const nextList = [...cleared[nextArea]];

          if (!targetModuleId || !nextList.includes(targetModuleId)) {
            nextList.push(moduleId);
          } else {
            const targetIndex = nextList.indexOf(targetModuleId);
            nextList.splice(targetIndex, 0, moduleId);
          }

          return { ...cleared, [nextArea]: nextList };
        });
      },
      moveToArea(moduleId, nextArea) {
        setLayout((current) => {
          const cleared = removeModule(current, moduleId);
          return {
            ...cleared,
            [nextArea]: [...cleared[nextArea], moduleId],
          };
        });
      },
      setAreaModules(area, moduleIds) {
        setLayout((current) => {
          const currentAreaSet = new Set(current[area]);
          const ordered = moduleIds.filter((moduleId) => currentAreaSet.has(moduleId));
          const remaining = current[area].filter((moduleId) => !ordered.includes(moduleId));
          return {
            ...current,
            [area]: [...ordered, ...remaining],
          };
        });
      },
      setModuleWidth(moduleId, widthPresetId) {
        setLayout((current) => ({
          ...current,
          widths: {
            ...current.widths,
            [moduleId]: widthPresetId,
          },
        }));
      },
      resetLayout() {
        setLayout(defaultLayout);
      },
    }),
    [defaultLayout, layout],
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);

  if (!context) {
    throw new Error(
      "useDashboardLayout must be used within a DashboardLayoutProvider.",
    );
  }

  return context;
}
