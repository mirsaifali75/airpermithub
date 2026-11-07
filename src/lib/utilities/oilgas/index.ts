import type { UtilityDef } from "../types";
import { chokes } from "./chokes";
import { drilling } from "./drilling";
import { naturalGas } from "./gas";
import { gasWell } from "./gaswell";
import { wellInflow } from "./inflow";
import { artificialLift } from "./lift";
import { crudeOil } from "./oil";
import { pipelines } from "./pipelines";
import { separators } from "./separators";

export const oilGasCalcs: UtilityDef[] = [naturalGas, crudeOil, wellInflow, gasWell, chokes, pipelines, separators, drilling, artificialLift];
