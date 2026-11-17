import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardStats, type DateRangeKey } from "@/lib/activity";
import { getSheetHubSummary } from "@/lib/dashboard";
import { isMasterEmail } from "@/lib/access";
import { AppHeader } from "@/components/app-header";
import { DashboardView } from "@/components/dashboard-view";
import { MobileNav } from "@/components/mobile-nav";

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
    <div className="tt-shell tt-shell-nav">
      <AppHeader
        email={session.user.email}
        active="dashboard"
        actions={
          master ? (
            <Link href="/access" className="tt-btn tt-btn-ghost on-dark tt-desktop-only-inline">
              Access
            </Link>
          ) : null
        }
      />
      <main className="tt-page tt-page-wide">
        <DashboardView stats={stats} hub={hub} />
      </main>
      <MobileNav active="dashboard" showAccess={master} />
    </div>
  );
}
