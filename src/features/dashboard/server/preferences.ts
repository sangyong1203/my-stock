import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboardPreferences } from "@/db/schema";
import { createDefaultDashboardLayout } from "@/features/dashboard/registry";
import type { DashboardLayoutState } from "@/features/dashboard/types";

function sanitizeLayout(input: unknown): DashboardLayoutState {
  const fallback = createDefaultDashboardLayout();

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const record = input as Partial<DashboardLayoutState>;
  const normalizeArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  const widths =
    record.widths && typeof record.widths === "object"
      ? Object.fromEntries(
          Object.entries(record.widths).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" && typeof entry[1] === "string",
          ),
        )
      : {};

  return {
    summary: normalizeArray(record.summary),
    workspace: normalizeArray(record.workspace),
    hidden: normalizeArray(record.hidden),
    widths,
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
    summary: layout.summary.length > 0 ? layout.summary : fallback.summary,
    workspace: layout.workspace.length > 0 ? layout.workspace : fallback.workspace,
    hidden: layout.hidden,
    widths: {
      ...fallback.widths,
      ...layout.widths,
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
    summary: sanitized.summary.length > 0 ? sanitized.summary : fallback.summary,
    workspace:
      sanitized.workspace.length > 0 ? sanitized.workspace : fallback.workspace,
    hidden: sanitized.hidden,
    widths: {
      ...fallback.widths,
      ...sanitized.widths,
    },
  };
}
