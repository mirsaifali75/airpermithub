import { ArrowLeftRight, Atom, Gauge, BookA, Calculator, ClipboardCheck, ClipboardList, ListChecks, Newspaper, Route, Scale, TrendingUp, type LucideIcon } from "lucide-react";
import type { ToolIcon as IconKey } from "@/lib/tools/catalog";

export const toolIcons: Record<IconKey, LucideIcon> = {
  rolling: TrendingUp,
  nsr: Scale,
  matrix: ListChecks,
  deviation: ClipboardList,
  convert: ArrowLeftRight,
  updates: Newspaper,
  glossary: BookA,
  finder: Route,
  calc: Calculator,
  applicability: ClipboardCheck,
  synthetic: Gauge,
  hap: Atom,
};
