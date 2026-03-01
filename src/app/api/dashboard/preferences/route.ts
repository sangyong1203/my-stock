import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveDashboardPreferenceLayout } from "@/features/dashboard/server/preferences";
import type { DashboardLayoutState } from "@/features/dashboard/types";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "Sign in is required to save dashboard preferences." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as { layout?: DashboardLayoutState };

  if (!body.layout) {
    return NextResponse.json(
      { ok: false, message: "Layout payload is required." },
      { status: 400 },
    );
  }

  await saveDashboardPreferenceLayout(userId, body.layout);

  return NextResponse.json({ ok: true });
}
