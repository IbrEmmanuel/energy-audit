import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardStats, type DateRangeKey } from "@/lib/activity";
import { getSheetHubSummary } from "@/lib/dashboard";
import { isMasterEmail } from "@/lib/access";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ range?: string }>;
};

function parseRange(raw?: string): DateRangeKey {
  if (raw === "today" || raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "7d";
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const params = await searchParams;
  const range = parseRange(params.range);
  const master = isMasterEmail(session.user.email);
  const [stats, hub] = await Promise.all([
    getDashboardStats(range),
    getSheetHubSummary(session.user.id),
  ]);

  return (
    <AppShell
      email={session.user.email}
      name={session.user.name}
      active="dashboard"
      showAccess={master}
      wide
    >
      <DashboardView stats={stats} hub={hub} userName={session.user.name} />
    </AppShell>
  );
}
