import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { emailFrom, isAdminEmail, LINK_MINUTES } from "@/lib/auth/config";
import { sendSignInEmail } from "@/lib/auth/email";
import { prisma } from "@/lib/db/prisma";

/**
 * Auth.js: email-link sign-in only (MIR's choice, 2026-10-31), database
 * sessions, and the Prisma adapter on the P0 User/Account/Session/
 * VerificationToken tables. Secrets come from server env only:
 * AUTH_SECRET, RESEND_API_KEY, DATABASE_URL.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: emailFrom,
      maxAge: LINK_MINUTES * 60,
      sendVerificationRequest: ({ identifier, url, provider }) =>
        sendSignInEmail({ to: identifier, url, from: provider.from ?? emailFrom, apiKey: provider.apiKey ?? "" }),
    }),
  ],
  pages: { signIn: "/sign-in", verifyRequest: "/sign-in/check-email", error: "/sign-in", newUser: "/account/setup" },
  callbacks: {
    // System accounts (the content import) never sign in.
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { isSystem: true } });
      return !existing?.isSystem;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id && user.email && isAdminEmail(user.email)) {
        await prisma.user.update({ where: { id: user.id }, data: { platformRole: "ADMIN" } });
      }
    },
  },
});
