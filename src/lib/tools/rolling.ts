/**
 * Rolling-window math for permit limits, such as a 12-month rolling total of
 * NOx emissions or gas throughput. Pure functions so the arithmetic is tested
 * and the tracker UI only renders it.
 *
 * The permit defines the window, whether it is a sum or an average, and what
 * a compliant value is. This module compares against the limit the user enters:
 * a window total above the limit is flagged "over"; equal to it is not.
 */

export type RollingMode = "sum" | "average";
export type RollingStatus = "partial" | "missing" | "ok" | "watch" | "over";

export interface RollingOptions {
  /** Window length in months. */
  period: number;
  mode: RollingMode;
  /** The limit for the window, in the same units as the values. Null to track without a limit. */
  limit: number | null;
  /** Percent of the limit at which a window is flagged for attention. */
  alertPct: number;
}

export interface RollingPoint {
  /** Monthly value; null when the month has no data. */
  value: number | null;
  /** True for planned (forecast) months. */
  forecast?: boolean;
}

export interface RollingRow {
  index: number;
  value: number | null;
  forecast: boolean;
  /** Months in the window that have data. */
  count: number;
  /** Window sum or average. For a partial window, the value over the months available. */
  total: number | null;
  /** total / limit, as a percent. */
  pct: number | null;
  status: RollingStatus;
}

export function computeRolling(points: RollingPoint[], o: RollingOptions): RollingRow[] {
  return points.map((p, i) => {
    const win = points.slice(Math.max(0, i - o.period + 1), i + 1);
    const vals = win.map((w) => w.value).filter((v): v is number => v !== null);
    const count = vals.length;
    const sum = vals.reduce((a, v) => a + v, 0);
    const full = win.length === o.period;
    const missing = count < win.length;
    const total = count === 0 ? null : o.mode === "sum" ? sum : sum / count;
    const pct = total !== null && o.limit ? (total / o.limit) * 100 : null;
    let status: RollingStatus;
    if (!full) status = "partial";
    else if (missing) status = "missing";
    else if (o.limit === null || total === null) status = "ok";
    else if (total > o.limit) status = "over";
    else if (pct !== null && pct >= o.alertPct) status = "watch";
    else status = "ok";
    return { index: i, value: p.value, forecast: !!p.forecast, count, total, pct, status };
  });
}

/**
 * The largest value next month can have while keeping the window at or below
 * the limit, given the most recent (period - 1) months. Null when there is no
 * limit or the recent months are incomplete. Negative means the window will be
 * over the limit next month even at zero.
 */
export function nextMonthHeadroom(points: RollingPoint[], o: RollingOptions): number | null {
  if (o.limit === null) return null;
  const need = o.period - 1;
  const recent = points.slice(Math.max(0, points.length - need));
  if (recent.length < need || recent.some((r) => r.value === null)) return null;
  const sum = recent.reduce((a, r) => a + (r.value ?? 0), 0);
  return o.mode === "sum" ? o.limit - sum : o.limit * o.period - sum;
}

/** Index of the first forecast row whose window is over the limit, or -1. */
export function firstForecastExceedance(rows: RollingRow[]): number {
  return rows.findIndex((r) => r.forecast && r.status === "over");
}
