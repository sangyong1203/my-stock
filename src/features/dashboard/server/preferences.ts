import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboardPreferences } from "@/db/schema";
import { createDefaultDashboardLayout } from "@/features/dashboard/registry";
import type {
  DashboardLayoutState,
  DashboardWorkspacePanel,
} from "@/features/dashboard/types";

function createPanelId(index: number) {
  return `workspace-panel-migrated-${index + 1}`;
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeWorkspacePanels(value: unknown): DashboardWorkspacePanel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((panel, index) => {
    if (!panel || typeof panel !== "object") {
      return [];
    }

    const record = panel as Partial<DashboardWorkspacePanel>;
    const moduleIds = normalizeArray(record.moduleIds).slice(0, 3);

    return [
      {
        id:
          typeof record.id === "string" && record.id.trim().length > 0
            ? record.id
            : createPanelId(index),
        moduleIds,
      },
    ];
  });
}

function sanitizeLayout(input: unknown): DashboardLayoutState {
  const fallback = createDefaultDashboardLayout();

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const record = input as Partial<DashboardLayoutState> & {
    hidden?: unknown;
    workspace?: unknown;
  };
  const widths =
    record.widths && typeof record.widths === "object"
      ? Object.fromEntries(
          Object.entries(record.widths).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" && typeof entry[1] === "string",
          ),
        )
      : {};
  const panelWidths =
    record.panelWidths && typeof record.panelWidths === "object"
      ? Object.fromEntries(
          Object.entries(record.panelWidths).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" && typeof entry[1] === "string",
          ),
        )
      : {};

  const legacyHidden = normalizeArray(record.hidden);
  const summary = normalizeArray(record.summary);
  const summaryHidden = normalizeArray(record.summaryHidden);
  const workspaceHidden = normalizeArray(record.workspaceHidden);
  const legacyWorkspace = normalizeArray(record.workspace);
  const workspacePanels =
    normalizeWorkspacePanels(record.workspacePanels).length > 0
      ? normalizeWorkspacePanels(record.workspacePanels)
      : legacyWorkspace.map((moduleId, index) => ({
          id: createPanelId(index),
          moduleIds: [moduleId],
        }));

  for (const moduleId of legacyHidden) {
    if (
      summary.includes(moduleId) ||
      summaryHidden.includes(moduleId) ||
      workspacePanels.some((panel) => panel.moduleIds.includes(moduleId)) ||
      workspaceHidden.includes(moduleId)
    ) {
      continue;
    }

    if (fallback.summary.includes(moduleId)) {
      summaryHidden.push(moduleId);
    } else {
      workspaceHidden.push(moduleId);
    }
  }

  return {
    summary,
    summaryHidden,
    workspacePanels,
    workspaceHidden,
    widths,
    panelWidths,
  };
}

export async function getDashboardPreferenceLayout(userId: string | null | undefined) {
  const fallback = createDefaultDashboardLayout();

  if (!userId) {
    return fallback;
  }

  const [preference] = await db
    .select({ layout: dashboardPreferences.layout })
    .from(dashboardPreferences)
    .where(eq(dashboardPreferences.userId, userId))
    .limit(1);

  if (!preference) {
    return fallback;
  }

  const layout = sanitizeLayout(preference.layout);

  return {
    ...fallback,
    ...layout,
    summary: layout.summary,
    summaryHidden: layout.summaryHidden,
    workspacePanels: layout.workspacePanels,
    workspaceHidden: layout.workspaceHidden,
    widths: {
      ...fallback.widths,
      ...layout.widths,
    },
    panelWidths: {
      ...fallback.panelWidths,
      ...layout.panelWidths,
    },
  };
}

export async function saveDashboardPreferenceLayout(
  userId: string,
  layout: DashboardLayoutState,
) {
  const sanitized = getDashboardPreferenceLayoutSync(layout);

  await db
    .insert(dashboardPreferences)
    .values({
      userId,
      layout: sanitized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardPreferences.userId,
      set: {
        layout: sanitized,
        updatedAt: new Date(),
      },
    });
}

function getDashboardPreferenceLayoutSync(layout: DashboardLayoutState) {
  const fallback = createDefaultDashboardLayout();
  const sanitized = sanitizeLayout(layout);

  return {
    ...fallback,
    ...sanitized,
    summary: sanitized.summary,
    summaryHidden: sanitized.summaryHidden,
    workspacePanels: sanitized.workspacePanels,
    workspaceHidden: sanitized.workspaceHidden,
    widths: {
      ...fallback.widths,
      ...sanitized.widths,
    },
    panelWidths: {
      ...fallback.panelWidths,
      ...sanitized.panelWidths,
    },
  };
}
