/**
 * Whether a show or production appears in the public catalog (browse, search,
 * show detail, trip suggestions, notifications). Matches show listing rules:
 * `needs_review` or undefined = not published.
 */
export function isCatalogPublished(dataStatus?: string | null): boolean {
  return dataStatus === "partial" || dataStatus === "complete";
}
