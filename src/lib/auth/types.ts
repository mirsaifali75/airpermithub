/**
 * Auth contract for pages and API routes. Auth.js (src/auth.ts) sits behind
 * `getSession()`; pages depend only on these types and helpers.
 */

export type AccountType = "INDIVIDUAL" | "CONSULTANT" | "COMPANY";
export type PlatformRole = "USER" | "EDITOR" | "REVIEWER" | "ADMIN";
export type PlanTier = "FREE" | "PROFESSIONAL" | "TEAM" | "ENTERPRISE";

export const accountTypes: { value: AccountType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "COMPANY", label: "Company" },
];

export interface SessionUser {
  id: string;
  /** Null for accounts made with a phone number. */
  email: string | null;
  /** E.164; set only once a texted code confirmed it. */
  phone: string | null;
  name: string | null;
  company: string | null;
  accountType: AccountType;
  platformRole: PlatformRole;
  plan: PlanTier;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
  twoStep: boolean;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/** Feature entitlements by plan. Payment is intentionally not implemented. */
export const entitlements: Record<PlanTier, string[]> = {
  FREE: ["regulation-search", "basic-calculators", "permit-finder-limited", "resources", "jobs", "permit-search-basic"],
  PROFESSIONAL: ["saved-facilities", "advanced-calculators", "saved-calculations", "compliance-calendar", "documents", "advanced-applicability", "exports", "ai-document-analysis"],
  TEAM: ["multiple-facilities", "multiple-users", "role-permissions", "company-dashboard", "task-assignment", "audit-history"],
  ENTERPRISE: ["sso", "api-access", "custom-integrations"],
};
