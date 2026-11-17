import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  grantEmailAccess,
  isMasterEmail,
  listGrantedWithLoginStats,
  revokeEmailAccess,
  updateGrantedProfile,
} from "@/lib/access";

type AccessBody = {
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
};

function serializeGrant(
  row: Awaited<ReturnType<typeof listGrantedWithLoginStats>>[number] | {
    id: string;
    email: string;
    companyName: string | null;
    phone: string | null;
    address: string | null;
    grantedBy: string | null;
    createdAt: Date;
    updatedAt?: Date;
    loginCount?: number;
    lastLoginAt?: string | null;
  },
) {
  return {
    id: row.id,
    email: row.email,
    companyName: row.companyName,
    phone: row.phone,
    address: row.address,
    grantedBy: row.grantedBy,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    loginCount: "loginCount" in row ? (row.loginCount ?? 0) : 0,
    lastLoginAt:
      "lastLoginAt" in row
        ? row.lastLoginAt ?? null
        : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const emails = await listGrantedWithLoginStats();
  return NextResponse.json({
    emails: emails.map((e) => serializeGrant(e)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as AccessBody;
  try {
    const row = await grantEmailAccess(body.email ?? "", session.user.email, {
      companyName: body.companyName,
      phone: body.phone,
      address: body.address,
    });
    return NextResponse.json(
      serializeGrant({ ...row, loginCount: 0, lastLoginAt: null }),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to grant access" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as AccessBody;
  try {
    const row = await updateGrantedProfile(body.email ?? "", {
      companyName: body.companyName,
      phone: body.phone,
      address: body.address,
    });
    const withStats = (await listGrantedWithLoginStats()).find(
      (e) => e.email === row.email,
    );
    return NextResponse.json(
      serializeGrant(
        withStats ?? { ...row, loginCount: 0, lastLoginAt: null },
      ),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update access" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as AccessBody;
  try {
    await revokeEmailAccess(body.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to revoke access" },
      { status: 400 },
    );
  }
}
