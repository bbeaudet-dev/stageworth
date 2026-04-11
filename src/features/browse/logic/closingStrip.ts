import { daysUntil } from "@/features/browse/logic/date";
import { formatDateShort } from "@/utils/dates";
import type { ProductionStatus } from "@/utils/productions";

export type ClosingStripBadge = { label: string; bg: string; text: string };

// ─── Coming soon (previews, announced openings, Search "Coming Soon") ───────

/**
 * Playbill strip for anything that is "opening / preview / announced".
 * Uses the brand blue — same hue family as all other badge systems.
 */
export function openingSoonPlaybillColors(isDark: boolean): { bg: string; text: string } {
  return isDark
    ? { bg: "rgba(83,109,254,0.2)", text: "#818CF8" }
    : { bg: "#EEF2FF", text: "#536DFE" };
}

// ─── Closing (end-date urgency — brand blue fading to neutral) ────────────────

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
 * Uses the same brand blue → muted scale as tier and role badges — no traffic lights.
 * Intensity signals urgency: ≤7 full BRAND_BLUE fades through indigo/periwinkle to neutral.
 *   ≤7   full BRAND_BLUE (most urgent)
 *   ≤14  medium indigo
 *   ≤42  light periwinkle
 *   else neutral gray (no purple text at the low-urgency end)
 */
export function closingStripColors(days: number, isDark: boolean): { bg: string; text: string } {
  if (days <= 7) {
    return isDark
      ? { bg: "rgba(83,109,254,0.85)", text: "#FFFFFF" }
      : { bg: "#536DFE", text: "#FFFFFF" };
  }
  if (days <= 14) {
    return isDark
      ? { bg: "rgba(83,109,254,0.55)", text: "#FFFFFF" }
      : { bg: "#7B8EFE", text: "#FFFFFF" };
  }
  if (days <= 42) {
    return isDark
      ? { bg: "rgba(83,109,254,0.28)", text: "#818CF8" }
      : { bg: "#B9C2FD", text: "#1E3399" };
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
    ? { label: "Open Run", bg: "rgba(83,109,254,0.2)", text: "#818CF8" }
    : { label: "Open Run", bg: "#EEF2FF", text: "#536DFE" };
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

    // When we know the closing date, let closingStripColors decide the urgency.
    // ≤7 days = full brand blue (most urgent), ≤14 medium, ≤42 light, else gray.
    // No upper cap — a show closing in 90 days correctly gets gray (not urgent),
    // while a show closing in 5 days gets full brand blue.
    if (production.closingDate && production.closingDate >= todayStr) {
      return closingStripColors(daysUntil(production.closingDate), isDark);
    }

    // No closing date known: show is open-ended (open run) or currently active.
    // Brand blue tint signals "running / worth knowing about".
    if (
      status === "in_previews" ||
      status === "open" ||
      status === "open_run"
    ) {
      return openRunStripBadge(isDark);
    }

    // Not yet started (announced) — lighter brand blue: "look forward to this".
    return openingSoonPlaybillColors(isDark);
  };

  // ── Derive primary label from status ─────────────────────────────────────
  const getPrimaryLabel = (): string => {
    if (status === "closed") {
      const d = formatDateShort(production.closingDate ?? "");
      return d ? `Closed ${d}` : "Closed";
    }

    // Closing date label for any actively running show — covers open, open_run, and in_previews.
    // The color already signals urgency; the label names the date so users know when it ends.
    if (
      production.closingDate &&
      production.closingDate >= todayStr &&
      (status === "open" || status === "open_run" || status === "in_previews")
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
      // No future opening date known — show is running but opening date is TBD.
      return "Running";
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
      ? { label: "In Previews", bg: "rgba(255,255,255,0.18)", text: "rgba(255,255,255,0.80)" }
      : { label: "In Previews", bg: "rgba(0,0,0,0.12)", text: "rgba(0,0,0,0.65)" };
  }

  return { primary, secondary };
}
