import { NextResponse } from "next/server";
import { getLiveActivityFeed } from "@/lib/activity";

/** Public live pulse for login page → feeds dashboard activity awareness. */
export async function GET() {
  try {
    const feed = await getLiveActivityFeed(14);
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        loginsToday: 0,
        activitiesToday: 0,
        recent: [],
      },
      { status: 200 },
    );
  }
}
