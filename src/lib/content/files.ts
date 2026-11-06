import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { glossary } from "@/lib/data/glossary";
import { federalRegulations } from "@/lib/data/regulations";
import type { StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { Content } from "./types";

/** The reviewed content committed to the repo: the import's input and the parity test's answer key. */
export function readFileContent(root = process.cwd()): Content {
  const dir = join(root, "data", "states");
  const states = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as StateAirPermitProfile)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { states, regulations: federalRegulations, glossary };
}
