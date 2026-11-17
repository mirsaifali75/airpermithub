import { ArrowLeftRight, Atom, BookA, Calculator, ClipboardCheck, ClipboardList, Cog, Droplets, Factory, FileSearch, Gauge, ListChecks, MonitorCheck, Newspaper, Route, Scale, TrendingUp, Wind, type LucideIcon } from "lucide-react";
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
  inventory: Factory,
  cam: MonitorCheck,
  utility: Cog,
  oilgas: Droplets,
  airtools: Wind,
  review: FileSearch,
};
