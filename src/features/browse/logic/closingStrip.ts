import { daysUntil } from "@/features/browse/logic/date";
import { formatDateShort } from "@/utils/dates";
import type { ProductionStatus } from "@/utils/productions";

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
 *
 * Thresholds match the badge urgency plan:
 *   ≤7 red · ≤14 orange-red · ≤42 orange · ≤70 yellow · else neutral
 */
export function closingStripColors(days: number, isDark: boolean): { bg: string; text: string } {
  if (days <= 7) {
    return isDark
      ? { bg: "rgba(239,68,68,0.22)", text: "#F87171" }
      : { bg: "#FEF2F2", text: "#B91C1C" };
  }
  if (days <= 14) {
    return isDark
      ? { bg: "rgba(249,115,22,0.2)", text: "#FB923C" }
      : { bg: "#FFF7ED", text: "#C2410C" };
  }
  if (days <= 42) {
    return isDark
      ? { bg: "rgba(234,179,8,0.18)", text: "#FBBF24" }
      : { bg: "#FFFBEB", text: "#B45309" };
  }
  if (days <= 70) {
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

// ─── Full status badge (richer text + urgency color) ─────────────────────────

export type FullStatusBadge = {
  /** Primary strip at bottom of card — describes current status. */
  primary: ClosingStripBadge;
  /** Optional secondary ghost strip shown above primary — only "In Previews". */
  secondary?: ClosingStripBadge;
};

/** Neutral gray for a show that has already closed. */
function closedColors(isDark: boolean): { bg: string; text: string } {
  return isDark
    ? { bg: "rgba(156,163,175,0.12)", text: "#D1D5DB" }
    : { bg: "#F3F4F6", text: "#9CA3AF" };
}

/**
 * Full status badge for show cards. Returns a primary badge (status text + urgency color)
 * and an optional secondary ghost badge ("In Previews" when the show is in previews).
 *
 * Text describes current status; color reflects urgency of closing (or open run / no info).
 * Reuses {@link closingStripColors}, {@link openRunStripBadge}, and
 * {@link openingSoonPlaybillColors} so all color logic lives in one place.
 */
export function fullStatusBadgeForProduction(
  production: {
    previewDate?: string | null;
    openingDate?: string | null;
    closingDate?: string | null;
    isOpenRun?: boolean | null;
  },
  status: ProductionStatus,
  todayStr: string,
  isDark: boolean,
): FullStatusBadge | null {
  // ── Derive urgency color ─────────────────────────────────────────────────
  const getColors = (): { bg: string; text: string } => {
    if (status === "closed") return closedColors(isDark);
    if (production.closingDate && production.closingDate >= todayStr) {
      return closingStripColors(daysUntil(production.closingDate), isDark);
    }
    if (production.isOpenRun === true || status === "open_run") {
      // Reuse openRunStripBadge colors — single source of truth
      const { bg, text } = openRunStripBadge(isDark);
      return { bg, text };
    }
    // Blue: running/upcoming with no closing info — reuse openingSoonPlaybillColors
    return openingSoonPlaybillColors(isDark);
  };

  // ── Derive primary label from status ─────────────────────────────────────
  const getPrimaryLabel = (): string => {
    if (status === "closed") {
      const d = formatDateShort(production.closingDate ?? "");
      return d ? `Closed ${d}` : "Closed";
    }

    // Closing date label for actively running shows — reuse closingStripLabel
    if (
      production.closingDate &&
      production.closingDate >= todayStr &&
      (status === "open" || status === "open_run")
    ) {
      return closingStripLabel(production.closingDate);
    }

    if (status === "open_run") return "Open Run";
    if (status === "open") return "Running";

    if (status === "in_previews") {
      if (production.openingDate && production.openingDate >= todayStr) {
        const d = formatDateShort(production.openingDate);
        if (d) return `Opens ${d}`;
      }
      return "Opens soon";
    }

    if (status === "announced") {
      if (production.previewDate && production.previewDate >= todayStr) {
        const d = formatDateShort(production.previewDate);
        if (d) return `Previews ${d}`;
      }
      if (production.openingDate && production.openingDate >= todayStr) {
        const d = formatDateShort(production.openingDate);
        if (d) return `Opens ${d}`;
      }
      return "Announced";
    }

    return "";
  };

  const label = getPrimaryLabel();
  if (!label) return null;

  const { bg, text } = getColors();
  const primary: ClosingStripBadge = { label, bg, text };

  // ── Secondary "In Previews" ghost strip ──────────────────────────────────
  // Transparent white/black so it reads as a subtle indicator without a color pop.
  let secondary: ClosingStripBadge | undefined;
  if (status === "in_previews") {
    secondary = isDark
      ? { label: "In Previews", bg: "rgba(255,255,255,0.10)", text: "rgba(255,255,255,0.55)" }
      : { label: "In Previews", bg: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.45)" };
  }

  return { primary, secondary };
}
