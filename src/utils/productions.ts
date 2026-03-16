// Shared production utilities — no Convex server dependencies.
// Safe to import from both backend (convex/) and frontend (app/) code.

export type ProductionStatus = "announced" | "in_previews" | "open" | "closed";

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function getProductionStatus(
  production: {
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
  },
  asOf: string = todayString()
): ProductionStatus {
  if (!production.previewDate) return "announced";
  if (production.closingDate && production.closingDate < asOf) return "closed";
  if (!production.openingDate || production.openingDate > asOf)
    return "in_previews";
  return "open";
}
