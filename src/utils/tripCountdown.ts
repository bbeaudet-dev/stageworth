/**
 * Human-readable countdown for a trip, used on TripCard and anywhere else
 * a concise time label is needed.
 *
 * Scale (applied symmetrically for upcoming / active / past):
 *   1 day               → "Tomorrow" / "Ends tomorrow" / "Yesterday"
 *   2–6 days            → "In X days"    / "Ends in X days"   / "X days ago"
 *   7–27 days           → "In X week(s)" / "Ends in X week(s)" / "X week(s) ago"
 *   28 days – 11 months → "In X month(s)"/ "Ends in X month(s)"/ "X month(s) ago"
 *   ≥ 12 months         → "In X year(s)" / "Ends in X year(s)" / "X year(s) ago"
 */

export type TripPhase = "upcoming" | "active" | "past";

export interface TripCountdown {
  text: string | null;
  phase: TripPhase;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Converts a number of days into the most appropriate human-readable unit. */
function scaleTime(days: number): string {
  if (days < 7) return plural(days, "day");
  if (days < 28) return plural(Math.floor(days / 7), "week");
  // Use Math.max(1,...) so 28–30 days shows "1 month" not "0 months"
  if (days < 365) return plural(Math.max(1, Math.round(days / 30)), "month");
  return plural(Math.max(1, Math.round(days / 365)), "year");
}

export function getTripCountdown(startDate: string, endDate: string): TripCountdown {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // ── Active ────────────────────────────────────────────────────────────────
  if (startDate <= todayStr && endDate >= todayStr) {
    const end = new Date(endDate + "T00:00:00Z");
    const daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft === 0) return { text: "Ends today", phase: "active" };
    if (daysLeft === 1) return { text: "Ends tomorrow", phase: "active" };
    return { text: `Ends in ${scaleTime(daysLeft)}`, phase: "active" };
  }

  // ── Upcoming ──────────────────────────────────────────────────────────────
  if (startDate > todayStr) {
    const start = new Date(startDate + "T00:00:00Z");
    const daysUntil = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil === 1) return { text: "Tomorrow", phase: "upcoming" };
    return { text: `In ${scaleTime(daysUntil)}`, phase: "upcoming" };
  }

  // ── Past ──────────────────────────────────────────────────────────────────
  const end = new Date(endDate + "T00:00:00Z");
  const daysSinceEnd = Math.round((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceEnd === 1) return { text: "Yesterday", phase: "past" };
  return { text: `${scaleTime(daysSinceEnd)} ago`, phase: "past" };
}
