import { daysUntil, formatDateShort } from "@/utils/dates";

export { formatDate, daysUntil } from "@/utils/dates";

/**
 * Opening / preview milestone for rails and playbills: only "today" and "tomorrow"
 * are relative; otherwise show the actual calendar date (short form).
 */
export function openingMilestoneLabel(milestoneISODate: string): string {
  const d = daysUntil(milestoneISODate);
  if (d === 0) return "Starts today";
  if (d === 1) return "Tomorrow";
  return formatDateShort(milestoneISODate);
}

/** Earliest preview or opening date on or after `todayStr` (YYYY-MM-DD). */
export function earliestFutureRunDate(
  previewDate: string | undefined,
  openingDate: string | undefined,
  todayStr: string
): string | null {
  const pool: string[] = [];
  if (previewDate && previewDate >= todayStr) pool.push(previewDate);
  if (openingDate && openingDate >= todayStr) pool.push(openingDate);
  if (pool.length === 0) return null;
  return pool.sort()[0];
}
