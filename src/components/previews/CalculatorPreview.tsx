import { getMethod } from "@/lib/calc/methods";
import { ToolPreview } from "./ToolPreview";

/** Signed-out preview for /calculators/[method]. The screenshot is the engine calculator with example inputs. */
export function CalculatorPreview({ method }: { method: string }) {
  const m = getMethod(method);
  if (!m) return null;
  return (
    <ToolPreview
      name={`${m.name} calculator`}
      image="/previews/calculator.webp"
      width={1400}
      height={853}
      next={`/calculators/${m.slug}`}
      formula={m.formula}
      points={[
        "Uncontrolled and controlled lb/hr, lb/day, and tons/yr",
        "Every intermediate step shown so a reviewer can check it by hand",
        "You cite the emission factor and its source",
        "Export to CSV or PDF and build a calculation set",
      ]}
    />
  );
}
