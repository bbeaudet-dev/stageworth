// Shared production utilities — no Convex server dependencies.
// Safe to import from both backend (convex/) and frontend (app/) code.

export type ProductionStatus = "announced" | "in_previews" | "open" | "open_run" | "closed";

/**
 * Sort key for upcoming / coming-soon lists (YYYY-MM-DD).
 * Soonest next milestone (on or after `asOf`) first; items with no future dated
 * milestone sort after those with dates (e.g. in previews with TBD opening).
 */
export function upcomingProductionSortKey(
  production: { previewDate?: string; openingDate?: string },
  asOf: string
): string {
  const pool: string[] = [];
  if (production.previewDate && production.previewDate >= asOf) {
    pool.push(production.previewDate);
  }
  if (production.openingDate && production.openingDate >= asOf) {
    pool.push(production.openingDate);
  }
  if (pool.length > 0) {
    return pool.sort()[0];
  }
  if (production.openingDate) return production.openingDate;
  if (production.previewDate) return production.previewDate;
  return "9999-12-31";
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function getProductionStatus(
  production: {
    previewDate?: string | null;
    openingDate?: string | null;
    closingDate?: string | null;
    isOpenRun?: boolean | null;
    isClosed?: boolean | null;
  },
  asOf: string = todayString()
): ProductionStatus {
  const { previewDate, openingDate, closingDate } = production;

  const { isOpenRun, isClosed } = production;

  // Explicit close flag — marks a production as closed even without a recorded closing date.
  // Counterpart to isOpenRun; allows disambiguating "missing closing date" from "still running".
  if (isClosed === true) {
    return "closed";
  }

  // If we have an explicit closing date in the past, it's closed.
  if (closingDate && closingDate < asOf) {
    return "closed";
  }

  // If we have neither a start nor an end date, we can't reasonably say it's current.
  if (!previewDate && !openingDate && !closingDate && !isOpenRun) {
    return "closed";
  }

  // Helper: decide based on preview/opening timeline.
  const hasPreview = !!previewDate;
  const hasOpening = !!openingDate;

  // Case: we know the opening date.
  if (hasOpening) {
    if (openingDate! <= asOf) {
      // Opening date has passed.
      if (hasPreview && previewDate! > asOf) {
        // In theory this shouldn't happen (preview after opening),
        // but if it does, treat as "announced".
        return "announced";
      }
      // Between opening and (optional) closing.
      return isOpenRun ? "open_run" : "open";
    }

    // Opening date is in the future.
    if (hasPreview) {
      if (previewDate! > asOf) {
        // Previews not started yet.
        return "announced";
      }
      // Between preview start and opening.
      return "in_previews";
    }

    // No preview date, but opening is in the future.
    return "announced";
  }

  // Case: no opening date, but we have a preview date.
  if (hasPreview) {
    if (previewDate! > asOf) {
      // Previews sometime in the future.
      return "announced";
    }
    // Previews have started; without an opening date recorded,
    // treat this as "in_previews" rather than fully open.
    return "in_previews";
  }

  // Case: no preview/opening, but we do have a closing date in the future.
  // We know it's not yet closed, but have no start; treat as "open" window.
  if (closingDate && closingDate >= asOf) {
    return "open";
  }

  // Confirmed open run with no closing date (and possibly no preview/opening dates recorded).
  if (isOpenRun) {
    return "open_run";
  }

  // Fallback – should be unreachable given guards above.
  return "closed";
}

/**
 * Whether this production appears in Browse production sections (Now Running / Previews / Announced).
 * Matches {@link getProductionStatus} with the app's venue/location gate.
 */
export function isProductionBrowseVisible(
  production: {
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
    isClosed?: boolean | null;
    theatre?: string;
    city?: string;
  },
  asOf: string = todayString()
): boolean {
  if (getProductionStatus(production, asOf) === "closed") return false;
  return Boolean(production.theatre?.trim() || production.city?.trim());
}
