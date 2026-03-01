import { getServerSession } from "next-auth";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { buildDashboardPageModel } from "@/features/dashboard/lib/build-dashboard-page-model";
import { getDashboardPreferenceLayout } from "@/features/dashboard/server/preferences";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/features/dashboard/server/get-dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const dashboard = await getDashboardData(session?.user?.id ?? null);
  const initialLayout = await getDashboardPreferenceLayout(session?.user?.id);
  const model = buildDashboardPageModel(dashboard, session, initialLayout);

  return <DashboardPage model={model} />;
}

