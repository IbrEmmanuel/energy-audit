import { prisma } from "./prisma";
import { getLoginCountsByEmail } from "./activity";

/** Master owner — always allowed to sign in and manage access. */
export const MASTER_EMAIL = "ibrahime08140696953@gmail.com";

export type GrantProfileInput = {
  companyName?: string | null;
  phone?: string | null;
  address?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanText(value: string | null | undefined, max = 200) {
  const t = (value ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.slice(0, max);
}

function envAllowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

export function isMasterEmail(email: string | null | undefined) {
  if (!email) return false;
  return normalizeEmail(email) === MASTER_EMAIL;
}

/** Master + env allowlist + DB grants. Nobody else can sign in. */
export async function isEmailAllowed(email: string | null | undefined) {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (normalized === MASTER_EMAIL) return true;
  if (envAllowlist().includes(normalized)) return true;

  const granted = await prisma.allowedEmail.findUnique({
    where: { email: normalized },
  });
  return Boolean(granted);
}

export async function listGrantedEmails() {
  return prisma.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/** Granted accounts + login counts/last login (all-time) by email. */
export async function listGrantedWithLoginStats() {
  const [rows, loginMap] = await Promise.all([
    listGrantedEmails(),
    getLoginCountsByEmail(),
  ]);

  return rows.map((row) => {
    const stats = loginMap.get(row.email.toLowerCase());
    return {
      ...row,
      loginCount: stats?.loginCount ?? 0,
      lastLoginAt: stats?.lastLoginAt ?? null,
    };
  });
}

export async function grantEmailAccess(
  email: string,
  grantedBy: string,
  profile: GrantProfileInput = {},
) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  if (normalized === MASTER_EMAIL) {
    throw new Error("Master account is already allowed");
  }

  const companyName = cleanText(profile.companyName, 160);
  const phone = cleanText(profile.phone, 40);
  const address = cleanText(profile.address, 240);

  return prisma.allowedEmail.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      grantedBy,
      companyName,
      phone,
      address,
    },
    update: {
      grantedBy,
      companyName,
      phone,
      address,
    },
  });
}

export async function updateGrantedProfile(
  email: string,
  profile: GrantProfileInput,
) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  if (normalized === MASTER_EMAIL) {
    throw new Error("Master profile is managed separately");
  }

  const existing = await prisma.allowedEmail.findUnique({
    where: { email: normalized },
  });
  if (!existing) {
    throw new Error("Account is not on the grant list");
  }

  return prisma.allowedEmail.update({
    where: { email: normalized },
    data: {
      companyName: cleanText(profile.companyName, 160),
      phone: cleanText(profile.phone, 40),
      address: cleanText(profile.address, 240),
    },
  });
}

export async function revokeEmailAccess(email: string) {
  const normalized = normalizeEmail(email);
  if (normalized === MASTER_EMAIL) {
    throw new Error("Cannot revoke master access");
  }
  await prisma.allowedEmail.deleteMany({ where: { email: normalized } });
}
