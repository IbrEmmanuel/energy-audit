import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import {
  isMasterEmail,
  listGrantedWithLoginStats,
  MASTER_EMAIL,
} from "@/lib/access";
import { AccessManager } from "@/components/access-manager";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/access");
  if (!isMasterEmail(session.user.email)) redirect("/audits");

  const emails = await listGrantedWithLoginStats();

  return (
    <AppShell
      email={session.user.email}
      name={session.user.name}
      active="access"
      showAccess
      narrow
    >
      <div className="tt-crumb">
        <Link href="/dashboard">Overview</Link>
        <span aria-hidden>/</span>
        <span>Access</span>
      </div>
      <div className="tt-toolbar">
        <div>
          <h1>Access control</h1>
          <p className="tt-toolbar-break">Master: {MASTER_EMAIL}</p>
        </div>
      </div>
      <p className="tt-sheet-banner">TOPTECH access · email · company · phone · address</p>
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
    </AppShell>
  );
}
