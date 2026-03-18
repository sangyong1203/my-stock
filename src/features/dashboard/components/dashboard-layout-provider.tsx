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
  DashboardWorkspacePanel,
} from "@/features/dashboard/types";
import { createDefaultDashboardLayout } from "@/features/dashboard/registry";

type DashboardLayoutContextValue = {
  layout: DashboardLayoutState;
  moveModule: (
    moduleId: string,
    nextArea: Exclude<DashboardArea, "workspace">,
    targetModuleId?: string | null,
  ) => void;
  moveWorkspaceModule: (
    moduleId: string,
    targetPanelId: string,
    targetModuleId?: string | null,
  ) => boolean;
  createWorkspacePanel: () => string;
  removeWorkspacePanel: (panelId: string) => void;
  setModuleWidth: (moduleId: string, widthPresetId: string) => void;
  setWorkspacePanelWidth: (panelId: string, widthPresetId: string) => void;
  resetLayout: () => void;
};

const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue | null>(null);

type Props = {
  children: ReactNode;
  storageScope: string;
  defaultLayout: DashboardLayoutState;
};

function createPanelId() {
  return `workspace-panel-${crypto.randomUUID()}`;
}

function getKnownModuleIds(defaultLayout: DashboardLayoutState) {
  return new Set([
    ...defaultLayout.summary,
    ...defaultLayout.summaryHidden,
    ...defaultLayout.workspacePanels.flatMap((panel) => panel.moduleIds),
    ...defaultLayout.workspaceHidden,
  ]);
}

function normalizeStringArray(items: unknown, allKnown: Set<string>) {
  return Array.isArray(items)
    ? items.filter(
        (item, index): item is string =>
          typeof item === "string" && allKnown.has(item) && items.indexOf(item) === index,
      )
    : [];
}

function normalizePanelWidths(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" && typeof entry[1] === "string",
    ),
  );
}

function sanitizeWorkspacePanels(
  input: unknown,
  allKnown: Set<string>,
): DashboardWorkspacePanel[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const usedModuleIds = new Set<string>();
  const panels: DashboardWorkspacePanel[] = [];

  for (const rawPanel of input) {
    if (!rawPanel || typeof rawPanel !== "object") {
      continue;
    }

    const panelRecord = rawPanel as Partial<DashboardWorkspacePanel>;
    const panelId =
      typeof panelRecord.id === "string" && panelRecord.id.trim().length > 0
        ? panelRecord.id
        : createPanelId();
    const moduleIds = Array.isArray(panelRecord.moduleIds)
      ? panelRecord.moduleIds.filter(
          (item): item is string =>
            typeof item === "string" &&
            allKnown.has(item) &&
            !usedModuleIds.has(item),
        )
      : [];

    if (moduleIds.length === 0) {
      panels.push({ id: panelId, moduleIds: [] });
      continue;
    }

    const limitedModuleIds = moduleIds.slice(0, 3);
    for (const moduleId of limitedModuleIds) {
      usedModuleIds.add(moduleId);
    }

    panels.push({
      id: panelId,
      moduleIds: limitedModuleIds,
    });
  }

  return panels;
}

function sanitizeLayout(
  layout: DashboardLayoutState,
  defaultLayout: DashboardLayoutState,
) {
  const allKnown = getKnownModuleIds(defaultLayout);
  const summary = normalizeStringArray(layout.summary, allKnown);
  const summaryHidden = normalizeStringArray(layout.summaryHidden, allKnown).filter(
    (item) => !summary.includes(item),
  );
  const workspaceHidden = normalizeStringArray(layout.workspaceHidden, allKnown).filter(
    (item) => !summary.includes(item) && !summaryHidden.includes(item),
  );
  const legacyWorkspace = normalizeStringArray(
    (layout as DashboardLayoutState & { workspace?: unknown }).workspace,
    allKnown,
  ).filter(
    (item) =>
      !summary.includes(item) &&
      !summaryHidden.includes(item) &&
      !workspaceHidden.includes(item),
  );
  const workspacePanels =
    sanitizeWorkspacePanels(layout.workspacePanels, allKnown).length > 0
      ? sanitizeWorkspacePanels(layout.workspacePanels, allKnown)
      : legacyWorkspace.map((moduleId) => ({
          id: createPanelId(),
          moduleIds: [moduleId],
        }));

  const occupied = new Set([
    ...summary,
    ...summaryHidden,
    ...workspaceHidden,
    ...workspacePanels.flatMap((panel) => panel.moduleIds),
  ]);

  const next: DashboardLayoutState = {
    summary,
    summaryHidden,
    workspacePanels,
    workspaceHidden,
    widths:
      layout.widths && typeof layout.widths === "object" ? { ...layout.widths } : {},
    panelWidths: normalizePanelWidths(layout.panelWidths),
  };

  for (const moduleId of allKnown) {
    if (occupied.has(moduleId)) {
      continue;
    }

    if (defaultLayout.summary.includes(moduleId)) {
      next.summaryHidden.push(moduleId);
      continue;
    }

    next.workspaceHidden.push(moduleId);
  }

  return next;
}

function removeModule(layout: DashboardLayoutState, moduleId: string): DashboardLayoutState {
  const nextPanels = layout.workspacePanels.map((panel) => ({
    ...panel,
    moduleIds: panel.moduleIds.filter((item) => item !== moduleId),
  }));

  return {
    summary: layout.summary.filter((item) => item !== moduleId),
    summaryHidden: layout.summaryHidden.filter((item) => item !== moduleId),
    workspacePanels: nextPanels,
    workspaceHidden: layout.workspaceHidden.filter((item) => item !== moduleId),
    widths: { ...layout.widths },
    panelWidths: { ...layout.panelWidths },
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
      moveWorkspaceModule(moduleId, targetPanelId, targetModuleId) {
        let moved = false;

        setLayout((current) => {
          const cleared = removeModule(current, moduleId);
          const nextPanels = cleared.workspacePanels.map((panel) => ({ ...panel }));
          const panelIndex = nextPanels.findIndex((panel) => panel.id === targetPanelId);

          if (panelIndex === -1) {
            return current;
          }

          const panel = nextPanels[panelIndex];
          if (
            panel.moduleIds.length >= 3 &&
            !panel.moduleIds.includes(moduleId)
          ) {
            return current;
          }

          const nextModuleIds = [...panel.moduleIds];
          if (!targetModuleId || !nextModuleIds.includes(targetModuleId)) {
            nextModuleIds.push(moduleId);
          } else {
            const targetIndex = nextModuleIds.indexOf(targetModuleId);
            nextModuleIds.splice(targetIndex, 0, moduleId);
          }

          panel.moduleIds = nextModuleIds.slice(0, 3);
          moved = true;

          return {
            ...cleared,
            workspacePanels: nextPanels,
          };
        });

        return moved;
      },
      createWorkspacePanel() {
        const panelId = createPanelId();

        setLayout((current) => ({
          ...current,
          workspacePanels: [
            ...current.workspacePanels,
            {
              id: panelId,
              moduleIds: [],
            },
          ],
        }));

        return panelId;
      },
      removeWorkspacePanel(panelId) {
        setLayout((current) => {
          const nextPanels = current.workspacePanels.filter((panel) => panel.id !== panelId);
          if (nextPanels.length === current.workspacePanels.length) {
            return current;
          }

          const nextPanelWidths = { ...current.panelWidths };
          delete nextPanelWidths[panelId];

          return {
            ...current,
            workspacePanels: nextPanels,
            panelWidths: nextPanelWidths,
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
      setWorkspacePanelWidth(panelId, widthPresetId) {
        setLayout((current) => ({
          ...current,
          panelWidths: {
            ...current.panelWidths,
            [panelId]: widthPresetId,
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
