import { daysUntil } from "@/features/browse/logic/date";

export type ClosingStripBadge = { label: string; bg: string; text: string };

/** Short date for strip, e.g. "Jan 5" this year or "Jan 5, 2027" otherwise. */
function formatClosingDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const cy = now.getFullYear();
  if (y === cy) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Label under playbill: relative copy for today / tomorrow, otherwise "Closes {date}".
 */
export function closingStripLabel(closingDate: string): string {
  const d = daysUntil(closingDate);
  if (d === 0) return "Closes today";
  if (d === 1) return "Closes tomorrow";
  const short = formatClosingDateShort(closingDate);
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
      ? { bg: "rgba(59,130,246,0.16)", text: "#93C5FD" }
      : { bg: "#EFF6FF", text: "#1D4ED8" };
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
