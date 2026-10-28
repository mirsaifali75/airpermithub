import { equipmentOptions, permitFinderIndustries, pollutants as pollutantOptions } from "@/lib/data/equipment";
import type { ScreeningInput } from "@/lib/screening";

/**
 * Strict validation for POST /api/v1/screening. Only known fields pass
 * through; every enum is checked against the same option lists the Permit
 * Finder uses, and free-text fields are length-capped.
 */

const MAX_TEXT = 120;
const MAX_LIST = 32;

const projects = ["new", "modification", "existing"] as const;
const authorizations = ["yes", "no", "unsure"] as const;
const yesNo = ["yes", "no"] as const;
const schedules = ["continuous", "limited"] as const;
const attainments = ["all-attainment", "some-nonattainment", "unsure"] as const;
const hapStatuses = ["major", "area", "unsure"] as const;

export type ValidationResult = { ok: true; value: ScreeningInput } | { ok: false; errors: string[] };

const isText = (v: unknown, max = MAX_TEXT): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;

function optionalEnum<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[], errors: string[]): T | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  errors.push(`${key} must be one of: ${allowed.join(", ")}`);
  return undefined;
}

export function validateScreening(raw: unknown, stateSlugs: ReadonlySet<string>): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, errors: ["Body must be a JSON object"] };
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (!isText(body.state) || !stateSlugs.has(body.state)) errors.push("state must be a state slug, for example \"texas\"");
  if (!isText(body.industry) || !(permitFinderIndustries as readonly string[]).includes(body.industry)) {
    errors.push(`industry must be one of: ${permitFinderIndustries.join(", ")}`);
  }
  if (!isText(body.facilityType)) errors.push(`facilityType is required (max ${MAX_TEXT} characters)`);
  if (body.county !== undefined && body.county !== "" && !isText(body.county)) errors.push(`county must be text (max ${MAX_TEXT} characters)`);

  const equipment = body.equipment;
  if (!Array.isArray(equipment) || equipment.length > MAX_LIST || !equipment.every((e) => (equipmentOptions as readonly unknown[]).includes(e))) {
    errors.push(`equipment must be an array of: ${equipmentOptions.join(", ")}`);
  }

  const controls = body.controls;
  if (controls !== undefined && (!Array.isArray(controls) || controls.length > MAX_LIST || !controls.every((c) => isText(c, 60)))) {
    errors.push("controls must be an array of short text values");
  }

  const pollutants = body.pollutants;
  if (pollutants !== undefined && (!Array.isArray(pollutants) || !pollutants.every((p) => (pollutantOptions as readonly unknown[]).includes(p)))) {
    errors.push(`pollutants must be an array of: ${pollutantOptions.join(", ")}`);
  }

  const project = optionalEnum(body, "project", projects, errors);
  const existingAuthorization = optionalEnum(body, "existingAuthorization", authorizations, errors);
  const pteKnown = optionalEnum(body, "pteKnown", yesNo, errors);
  const schedule = optionalEnum(body, "schedule", schedules, errors);
  const datesKnown = optionalEnum(body, "datesKnown", yesNo, errors);
  const attainment = optionalEnum(body, "attainment", attainments, errors);
  const hapStatus = optionalEnum(body, "hapStatus", hapStatuses, errors);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      state: body.state as string,
      county: typeof body.county === "string" && body.county !== "" ? body.county.trim() : undefined,
      industry: body.industry as string,
      facilityType: (body.facilityType as string).trim(),
      equipment: [...new Set(equipment as string[])],
      controls: controls ? [...new Set(controls as string[])] : undefined,
      project,
      existingAuthorization,
      pteKnown,
      schedule,
      pollutants: pollutants ? [...new Set(pollutants as string[])] : undefined,
      datesKnown,
      attainment,
      hapStatus,
    },
  };
}
