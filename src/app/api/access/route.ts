import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  grantEmailAccess,
  isMasterEmail,
  listGrantedEmails,
  revokeEmailAccess,
} from "@/lib/access";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const emails = await listGrantedEmails();
  return NextResponse.json({ emails });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  try {
    const row = await grantEmailAccess(body.email ?? "", session.user.email);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to grant access" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
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
