import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { googleEnabled, safeNext, SESSION_DAYS, sessionCookieName, useSecureCookies } from "@/lib/auth/config";
import { googleGate } from "@/lib/auth/flows";
import { afterSignIn } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Auth.js handles Google sign-in and reads every session. Email-and-password
 * sign-in runs in our own server actions (src/app/sign-in/actions.ts), which
 * create sessions in the same table with the same cookie, so `auth()` and
 * sign-out treat both alike. Database sessions, so signing out ends them.
 * Secrets come from server env only: AUTH_SECRET, AUTH_GOOGLE_ID,
 * AUTH_GOOGLE_SECRET, DATABASE_URL.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: SESSION_DAYS * 86_400 },
  useSecureCookies,
  providers: googleEnabled()
    ? [
        Google({
          // Google confirms the address; googleGate below makes linking to an existing account safe.
          allowDangerousEmailAccountLinking: true,
          profile: (p) => ({
            id: p.sub, name: p.name ?? null, email: String(p.email).toLowerCase(), image: null,
            emailVerified: p.email_verified ? new Date() : null,
          }),
        }),
      ]
    : [],
  pages: { signIn: "/sign-in", error: "/sign-in", newUser: "/account/setup" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile) return false;
      const jar = await cookies();
      const callback = jar.get(`${useSecureCookies ? "__Secure-" : ""}authjs.callback-url`)?.value;
      let next = "/dashboard";
      try {
        next = safeNext(callback ? new URL(callback, "http://x").pathname + new URL(callback, "http://x").search : undefined);
      } catch {}
      const token = jar.get(sessionCookieName)?.value;
      const session = token ? await prisma.session.findUnique({ where: { sessionToken: token } }) : null;
      return googleGate(prisma, profile, account, next, { signedInAs: session && session.expires > new Date() ? session.userId : null });
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      const u = await prisma.user.findUnique({ where: { id: user.id } });
      if (u) await afterSignIn(prisma, u);
    },
  },
});
