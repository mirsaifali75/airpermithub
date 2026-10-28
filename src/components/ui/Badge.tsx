import { BadgeCheck, CircleAlert, CircleDashed, CircleHelp, Clock, FileText, FlaskConical, History, ShieldCheck, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ApplicabilityStatus, ComplianceStatus, ContentStatus, DocumentOrigin } from "@/lib/data/types";
import type { Verification } from "@/lib/data/state-profile-types";

type Tone = "green" | "blue" | "amber" | "red" | "gray" | "navy" | "cyan";

const tones: Record<Tone, string> = {
  green: "bg-eco-50 text-eco-700 ring-eco-500/25",
  blue: "bg-brand-50 text-brand-700 ring-brand-500/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-500/30",
  red: "bg-red-50 text-red-700 ring-red-500/25",
  gray: "bg-slate-100 text-slate-700 ring-slate-400/25",
  navy: "bg-navy-900 text-white ring-navy-900",
  cyan: "bg-cyan-500/10 text-sky-800 ring-cyan-500/30",
};

export function Badge({ tone = "gray", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const i = "h-3.5 w-3.5";

const contentMap: Record<ContentStatus, { tone: Tone; label: string; icon: ReactNode }> = {
  "official-source": { tone: "green", label: "Official Source", icon: <ShieldCheck className={i} /> },
  "aph-summary": { tone: "blue", label: "AirPermitHub Summary", icon: <FileText className={i} /> },
  "needs-review": { tone: "amber", label: "Needs Review", icon: <CircleAlert className={i} /> },
  "recently-updated": { tone: "cyan", label: "Recently Updated", icon: <History className={i} /> },
  archived: { tone: "gray", label: "Archived", icon: <History className={i} /> },
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const m = contentMap[status];
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

const applicabilityMap: Record<ApplicabilityStatus, { tone: Tone; label: string; icon: ReactNode }> = {
  "potentially-applicable": { tone: "blue", label: "Potentially Applicable", icon: <CircleAlert className={i} /> },
  "likely-not-applicable": { tone: "gray", label: "Likely Not Applicable Based on Entered Information", icon: <CircleDashed className={i} /> },
  "more-info-needed": { tone: "amber", label: "Additional Review Required", icon: <CircleHelp className={i} /> },
  "insufficient-info": { tone: "red", label: "Insufficient Information", icon: <CircleHelp className={i} /> },
};

export function ApplicabilityBadge({ status }: { status: ApplicabilityStatus }) {
  const m = applicabilityMap[status];
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

const complianceMap: Record<ComplianceStatus, { tone: Tone; label: string }> = {
  "on-track": { tone: "green", label: "On Track" },
  "due-soon": { tone: "amber", label: "Due Soon" },
  overdue: { tone: "red", label: "Overdue" },
  completed: { tone: "blue", label: "Completed" },
  "not-evaluated": { tone: "gray", label: "Not Evaluated" },
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const m = complianceMap[status];
  return (
    <Badge tone={m.tone} icon={<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}>
      {m.label}
    </Badge>
  );
}

const originMap: Record<DocumentOrigin, { tone: Tone; label: string; icon: ReactNode }> = {
  official: { tone: "green", label: "Official Source", icon: <ShieldCheck className={i} /> },
  "aph-summary": { tone: "blue", label: "AirPermitHub Summary", icon: <FileText className={i} /> },
  "user-upload": { tone: "gray", label: "User Upload", icon: <Upload className={i} /> },
  demo: { tone: "amber", label: "Demo Record", icon: <FlaskConical className={i} /> },
};

export function OriginBadge({ origin }: { origin: DocumentOrigin }) {
  const m = originMap[origin];
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

const verificationMap: Record<Verification, { tone: Tone; label: string; icon: ReactNode }> = {
  verified: { tone: "green", label: "Verified against agency source", icon: <BadgeCheck className={i} /> },
  partial: { tone: "amber", label: "Partially verified", icon: <CircleAlert className={i} /> },
  unverified: { tone: "amber", label: "Not yet verified", icon: <CircleHelp className={i} /> },
};

export function VerificationBadge({ level }: { level: Verification }) {
  const m = verificationMap[level];
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

export function DemoBadge({ children = "Demo data" }: { children?: ReactNode }) {
  return <Badge tone="amber" icon={<FlaskConical className={i} />}>{children}</Badge>;
}

export function CitationBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-navy-900/5 px-2 py-0.5 font-mono text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-900/10 break-words">
      {children}
    </span>
  );
}

export function ReviewedBadge({ date }: { date: string | null }) {
  return (
    <Badge tone={date ? "gray" : "amber"} icon={<Clock className={i} />}>
      {date ? `Last reviewed ${date}` : "Not yet reviewed"}
    </Badge>
  );
}
