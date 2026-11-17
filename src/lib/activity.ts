import { prisma } from "./prisma";

export const ACTIVITY_TYPES = [
  "login",
  "login_view",
  "login_start",
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

export type LoginCountByEmail = {
  email: string;
  loginCount: number;
  lastLoginAt: string | null;
};

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
  loginsByEmail: LoginCountByEmail[];
  flow: { date: string; logins: number; activities: number }[];
  recent: {
    id: string;
    type: string;
    email: string | null;
    label: string | null;
    createdAt: string;
  }[];
};

/** Aggregate login events by email (optional date range). */
export async function getLoginCountsByEmail(opts?: {
  start?: Date;
  end?: Date;
}): Promise<Map<string, LoginCountByEmail>> {
  const where = {
    type: "login" as const,
    email: { not: null },
    ...(opts?.start || opts?.end
      ? {
          createdAt: {
            ...(opts.start ? { gte: opts.start } : {}),
            ...(opts.end ? { lte: opts.end } : {}),
          },
        }
      : {}),
  };

  const grouped = await prisma.activityEvent.groupBy({
    by: ["email"],
    where,
    _count: { _all: true },
    _max: { createdAt: true },
  });

  const map = new Map<string, LoginCountByEmail>();
  for (const row of grouped) {
    if (!row.email) continue;
    const email = row.email.toLowerCase();
    map.set(email, {
      email,
      loginCount: row._count._all,
      lastLoginAt: row._max.createdAt?.toISOString() ?? null,
    });
  }
  return map;
}

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

  const loginByEmail = new Map<string, { count: number; last: Date }>();
  for (const e of logins) {
    const key = (e.email || e.userId || "unknown").toLowerCase();
    const prev = loginByEmail.get(key);
    if (!prev) {
      loginByEmail.set(key, { count: 1, last: e.createdAt });
    } else {
      prev.count += 1;
      if (e.createdAt > prev.last) prev.last = e.createdAt;
    }
  }

  const loginsByEmail: LoginCountByEmail[] = [...loginByEmail.entries()]
    .map(([email, v]) => ({
      email,
      loginCount: v.count,
      lastLoginAt: v.last.toISOString(),
    }))
    .sort((a, b) => b.loginCount - a.loginCount || a.email.localeCompare(b.email));

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
    loginsByEmail,
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
    case "login_view":
      return "Login page open";
    case "login_start":
      return "Google sign-in started";
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

function maskEmail(email: string | null | undefined) {
  if (!email) return "Staff";
  const [user, domain] = email.split("@");
  if (!domain) return "Staff";
  const visible = user.slice(0, 2) || "u";
  return `${visible}***@${domain}`;
}

/** Public live feed for login page + dashboard pulse (emails masked). */
export async function getLiveActivityFeed(limit = 12) {
  const events = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(40, Math.max(4, limit)),
  });

  const today = rangeToDates("today");
  const [loginsToday, activitiesToday] = await Promise.all([
    prisma.activityEvent.count({
      where: {
        type: "login",
        createdAt: { gte: today.start, lte: today.end },
      },
    }),
    prisma.activityEvent.count({
      where: { createdAt: { gte: today.start, lte: today.end } },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    loginsToday,
    activitiesToday,
    recent: events.map((e) => ({
      id: e.id,
      type: e.type,
      label: activityLabel(e.type),
      detail: e.label,
      actor: maskEmail(e.email),
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
