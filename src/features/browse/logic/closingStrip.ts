import { daysUntil } from "@/features/browse/logic/date";
import { formatDateShort } from "@/utils/dates";

export type ClosingStripBadge = { label: string; bg: string; text: string };

// ─── Coming soon (previews, announced openings, Search “Coming Soon”) ───────

/**
 * Playbill strip for anything that is “opening / preview / announced” — always this
 * cool blue. Closing urgency uses only warm tones in {@link closingStripColors}.
 */
export function openingSoonPlaybillColors(isDark: boolean): { bg: string; text: string } {
  return isDark
    ? { bg: "rgba(59,130,246,0.15)", text: "#60A5FA" }
    : { bg: "#EFF6FF", text: "#3B82F6" };
}

// ─── Closing (end-date urgency — red → orange → amber → yellow, then neutral) ─

/**
 * Label under playbill: relative copy for today / tomorrow, otherwise "Closes {date}".
 */
export function closingStripLabel(closingDate: string): string {
  const d = daysUntil(closingDate);
  if (d === 0) return "Closes today";
  if (d === 1) return "Closes tomorrow";
  const short = formatDateShort(closingDate);
  return short ? `Closes ${short}` : "";
}

/**
 * Background + text color from days until closing (future dates only; d >= 0).
 */
export function closingStripColors(days: number, isDark: boolean): { bg: string; text: string } {
  if (days <= 1) {
    return isDark
      ? { bg: "rgba(239,68,68,0.22)", text: "#F87171" }
      : { bg: "#FEF2F2", text: "#B91C1C" };
  }
  if (days <= 7) {
    return isDark
      ? { bg: "rgba(249,115,22,0.2)", text: "#FB923C" }
      : { bg: "#FFF7ED", text: "#C2410C" };
  }
  if (days <= 30) {
    return isDark
      ? { bg: "rgba(234,179,8,0.18)", text: "#FBBF24" }
      : { bg: "#FFFBEB", text: "#B45309" };
  }
  if (days <= 60) {
    return isDark
      ? { bg: "rgba(234,179,8,0.1)", text: "#FCD34D" }
      : { bg: "#FEF9C3", text: "#A16207" };
  }
  return isDark
    ? { bg: "rgba(156,163,175,0.14)", text: "#D1D5DB" }
    : { bg: "#F3F4F6", text: "#6B7280" };
}

/**
 * Badge config for a future closing date, or null if date is missing or in the past.
 */
export function closingStripBadge(
  closingDate: string | undefined | null,
  todayStr: string,
  isDark: boolean,
): ClosingStripBadge | null {
  if (!closingDate || closingDate < todayStr) return null;
  const d = daysUntil(closingDate);
  if (d < 0) return null;
  const label = closingStripLabel(closingDate);
  if (!label) return null;
  const { bg, text } = closingStripColors(d, isDark);
  return { label, bg, text };
}

// ─── Open run & trip playbills ───────────────────────────────────────────────

/** Strip when a production is an open-ended run (no closing date to drive {@link closingStripBadge}). */
export function openRunStripBadge(isDark: boolean): ClosingStripBadge {
  return isDark
    ? { label: "Open Run", bg: "rgba(34,197,94,0.15)", text: "#4ADE80" }
    : { label: "Open Run", bg: "#F0FDF4", text: "#22C55E" };
}

/**
 * Bottom strip for trip playbills: closing urgency when dated, otherwise open run
 * when the server marks the run as open-ended.
 */
export function tripPlaybillStripBadge(
  row: {
    closingDate?: string | null;
    isOpenRun?: boolean | null;
    tripProductionStatus?: string | null;
  },
  todayStr: string,
  isDark: boolean,
): ClosingStripBadge | null {
  const closing = closingStripBadge(row.closingDate, todayStr, isDark);
  if (closing) return closing;
  if (row.isOpenRun === true || row.tripProductionStatus === "open_run") {
    return openRunStripBadge(isDark);
  }
  return null;
}
