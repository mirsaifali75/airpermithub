import type { GlossaryTerm } from "@/lib/data/glossary";
import type { StateAirPermitProfile } from "@/lib/data/state-profile-types";
import type { Regulation } from "@/lib/data/types";

/** Everything the content database holds, in the shapes the site renders. */
export interface Content {
  states: StateAirPermitProfile[];
  regulations: Regulation[];
  glossary: GlossaryTerm[];
}
