export { formatDate, daysUntil } from "@/utils/dates";

/** Human-readable label for a closing countdown (e.g. cards, rails). */
export function closingCountdownLabel(diffDays: number): string {
  if (diffDays === 0) return "Closes today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 28) {
    const w = Math.floor(diffDays / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }
  return "1 month";
}

/** Human-readable label for first preview / opening (coming soon). */
export function openingCountdownLabel(diffDays: number): string {
  if (diffDays === 0) return "Starts today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 28) {
    const w = Math.floor(diffDays / 7);
    return `${w} week${w === 1 ? "" : "s"}`;
  }
  return "1 month";
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
