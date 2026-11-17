import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isEmailAllowed, isMasterEmail } from "@/lib/access";
import { trackActivity } from "@/lib/activity";

async function getGoogleAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return undefined;

  const expiresAt = account.expires_at ?? 0;
  const stillValid = expiresAt * 1000 > Date.now() + 60_000;
  if (stillValid) return account.access_token;

  if (!account.refresh_token) return account.access_token;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID!,
        client_secret:
          process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!res.ok || !data.access_token) return account.access_token;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      },
    });
    return data.access_token;
  } catch {
    return account.access_token;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          // Let phone users pick the master Gmail (not a different signed-in account)
          prompt: "select_account consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email ?? (profile as { email?: string } | undefined)?.email;
      // Universal login page — only master + granted emails may proceed
      return isEmailAllowed(email);
    },
    async jwt({ token, user, account }) {
      if (user?.id) token.userId = user.id;
      if (user?.email) {
        token.email = user.email;
        token.isMaster = isMasterEmail(user.email);
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      // Fresh Google sign-in → track login for dashboard KPIs
      if (account && user?.id) {
        await trackActivity({
          type: "login",
          userId: user.id,
          email: user.email,
          label: "Google sign-in",
        });
      }
      return token;
    },
    async session({ session, token }) {
      const userId = (token.userId as string) || token.sub || "";
      if (session.user) {
        session.user.id = userId;
        if (token.email) session.user.email = token.email as string;
      }
      session.isMaster = Boolean(token.isMaster) || isMasterEmail(session.user?.email);
      session.accessToken =
        (userId ? await getGoogleAccessToken(userId) : undefined) ||
        (token.accessToken as string | undefined);
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
