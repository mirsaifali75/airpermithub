/**
 * Provider-agnostic auth contract. Phase 2 plugs in a provider (e.g. Auth.js
 * with the Prisma adapter) behind `getSession()`; pages and API routes depend
 * only on these types and helpers.
 */

export type AccountType = "INDIVIDUAL" | "CONSULTANT" | "COMPANY" | "ADMIN";
export type PlanTier = "FREE" | "PROFESSIONAL" | "TEAM" | "ENTERPRISE";
export type OrgRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export const accountTypes: { value: AccountType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "COMPANY", label: "Company" },
  { value: "ADMIN", label: "Admin" },
];

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  accountType: AccountType;
  plan: PlanTier;
  organizationId: string | null;
  orgRole: OrgRole | null;
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

const tierOrder: PlanTier[] = ["FREE", "PROFESSIONAL", "TEAM", "ENTERPRISE"];

export function can(plan: PlanTier, feature: string): boolean {
  return tierOrder.slice(0, tierOrder.indexOf(plan) + 1).some((t) => entitlements[t].includes(feature));
}
