import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import {
  isMasterEmail,
  listGrantedWithLoginStats,
  MASTER_EMAIL,
} from "@/lib/access";
import { AccessManager } from "@/components/access-manager";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/access");
  if (!isMasterEmail(session.user.email)) redirect("/audits");

  const emails = await listGrantedWithLoginStats();

  return (
    <div className="tt-shell tt-shell-nav">
      <AppHeader email={session.user.email} active="access" />
      <main className="tt-page tt-page-narrow">
        <div className="tt-crumb">
          <Link href="/dashboard">Dashboard</Link>
          <span aria-hidden>/</span>
          <span>Access</span>
        </div>
        <div className="tt-toolbar">
          <div>
            <h1>Access control</h1>
            <p className="tt-toolbar-break">Master: {MASTER_EMAIL}</p>
          </div>
        </div>
        <p className="tt-lede">
          Grant Google access with company, phone, and address. Login counts are
          calculated per email from live sign-in events.
        </p>
        <AccessManager
          initial={emails.map((e) => ({
            id: e.id,
            email: e.email,
            companyName: e.companyName,
            phone: e.phone,
            address: e.address,
            grantedBy: e.grantedBy,
            createdAt: e.createdAt.toISOString(),
            loginCount: e.loginCount,
            lastLoginAt: e.lastLoginAt,
          }))}
        />
      </main>
      <MobileNav active="access" showAccess />
    </div>
  );
}
