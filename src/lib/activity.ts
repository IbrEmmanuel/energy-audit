import { prisma } from "./prisma";

export const ACTIVITY_TYPES = [
  "login",
  "proposal_create",
  "proposal_save",
  "proposal_delete",
  "sheet_sync",
  "pdf_export",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type DateRangeKey = "7d" | "30d" | "90d" | "today";

export function rangeToDates(range: DateRangeKey, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "today") {
    return { start, end };
  }
  const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  start.setDate(start.getDate() - days);
  return { start, end };
}

export async function trackActivity(input: {
  type: ActivityType;
  userId?: string | null;
  email?: string | null;
  label?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        email: input.email?.toLowerCase() ?? null,
        label: input.label ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    // Analytics must never break the product path
  }
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function eachDay(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type DashboardStats = {
  range: DateRangeKey;
  start: string;
  end: string;
  logins: number;
  uniqueUsers: number;
  activities: number;
  proposalsCreated: number;
  sheetSyncs: number;
  pdfExports: number;
  flow: { date: string; logins: number; activities: number }[];
  recent: {
    id: string;
    type: string;
    email: string | null;
    label: string | null;
    createdAt: string;
  }[];
};

export async function getDashboardStats(range: DateRangeKey): Promise<DashboardStats> {
  const { start, end } = rangeToDates(range);

  const events = await prisma.activityEvent.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
  });

  const logins = events.filter((e) => e.type === "login");
  const uniqueUsers = new Set(
    logins.map((e) => e.userId || e.email).filter(Boolean) as string[],
  ).size;

  const byDay = new Map<string, { logins: number; activities: number }>();
  for (const key of eachDay(start, end)) {
    byDay.set(key, { logins: 0, activities: 0 });
  }
  for (const e of events) {
    const key = dayKey(e.createdAt);
    const bucket = byDay.get(key) ?? { logins: 0, activities: 0 };
    bucket.activities += 1;
    if (e.type === "login") bucket.logins += 1;
    byDay.set(key, bucket);
  }

  return {
    range,
    start: start.toISOString(),
    end: end.toISOString(),
    logins: logins.length,
    uniqueUsers,
    activities: events.length,
    proposalsCreated: events.filter((e) => e.type === "proposal_create").length,
    sheetSyncs: events.filter((e) => e.type === "sheet_sync").length,
    pdfExports: events.filter((e) => e.type === "pdf_export").length,
    flow: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    recent: events.slice(0, 18).map((e) => ({
      id: e.id,
      type: e.type,
      email: e.email,
      label: e.label,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export function activityLabel(type: string) {
  switch (type) {
    case "login":
      return "User login";
    case "proposal_create":
      return "Proposal created";
    case "proposal_save":
      return "Proposal saved";
    case "sheet_sync":
      return "Sheet sync";
    case "pdf_export":
      return "PDF export";
    case "proposal_delete":
      return "Proposal deleted";
    default:
      return type;
  }
}
