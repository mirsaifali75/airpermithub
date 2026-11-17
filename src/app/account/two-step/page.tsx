import type { Metadata } from "next";
import { withSocial } from "@/lib/seo";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { ConfirmTwoStepForm, DisableTwoStepForm, NewBackupCodesForm } from "@/components/auth/TwoStepForms";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { backupCodesLeft, pendingTwoStep } from "@/lib/auth/flows";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { startTwoStep } from "../actions";

export const metadata: Metadata = withSocial({ title: "Two-step login", robots: { index: false } });

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/sign-in?next=/account/two-step");
  const error = (await searchParams).error;
  const pending = s.user.twoStep ? null : await pendingTwoStep(prisma, s.user.id);
  const qr = pending ? await QRCode.toString(pending.url, { type: "svg", margin: 1, width: 200, errorCorrectionLevel: "M" }) : null;
  const left = s.user.twoStep ? await backupCodesLeft(prisma, s.user.id) : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account settings", href: "/account" }, { label: "Two-step login" }]}
        eyebrow="Account" title="Two-step login" icon={<ShieldCheck className="h-7 w-7" />}
        description="After your password, sign-in asks for a 6-digit code from an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator, or 1Password."
      />
      <div className="container-page max-w-3xl space-y-6 py-10">
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {s.user.twoStep ? (
          <>
            <Card title="Two-step login is on">
              <p className="text-sm text-muted">You have {left} unused backup {left === 1 ? "code" : "codes"}. Make new ones if you&apos;re running low or think they were seen; the old ones stop working.</p>
              <div className="mt-4"><NewBackupCodesForm /></div>
            </Card>
            {s.user.platformRole === "USER" ? (
              <Card title="Turn it off">
                <p className="mb-4 text-sm text-muted">Enter a current code to turn two-step login off. Your account is then protected by your password alone.</p>
                <DisableTwoStepForm />
              </Card>
            ) : (
              <Card title="Required for your role">
                <p className="text-sm text-muted">Admin and reviewer accounts keep two-step login on.</p>
              </Card>
            )}
          </>
        ) : !s.user.emailVerified && !s.user.phoneVerified ? (
          <Card title="Confirm your email first">
            <p className="text-sm text-muted">Two-step login needs a confirmed email address, so a lost phone can always be recovered. Use the link we emailed you, or send a new one from account settings.</p>
          </Card>
        ) : pending && qr ? (
          <Card title="Scan this code">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Open your authenticator app and add an account.</li>
              <li>Scan the code below, or type the setup key.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-[200px] w-[200px] shrink-0 rounded-xl border border-line bg-white p-1" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">Setup key</p>
                <p className="mt-1 font-mono break-all text-slate-700">{pending.secret.match(/.{1,4}/g)?.join(" ")}</p>
              </div>
            </div>
            <div className="mt-6"><ConfirmTwoStepForm /></div>
          </Card>
        ) : (
          <Card title="Set it up">
            <p className="mb-4 text-sm text-muted">It takes about a minute. You&apos;ll also get ten backup codes for when your phone isn&apos;t at hand.</p>
            <form action={startTwoStep}><Button type="submit">Set up two-step login</Button></form>
          </Card>
        )}
      </div>
    </>
  );
}
