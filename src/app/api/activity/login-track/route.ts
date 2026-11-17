import { NextResponse } from "next/server";
import { trackActivity } from "@/lib/activity";

type Body = {
  phase?: "view" | "start";
};

/** Track login-page lifecycle into dashboard ActivityEvent stream. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const phase = body.phase === "start" ? "start" : "view";

  await trackActivity({
    type: phase === "start" ? "login_start" : "login_view",
    label: phase === "start" ? "Continue with Google" : "Login page",
    meta: { source: "login_page", phase },
  });

  return NextResponse.json({ ok: true });
}
