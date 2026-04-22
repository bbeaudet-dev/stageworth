import type { Id } from "@/convex/_generated/dataModel";
import type { RankedTier } from "@/types/ranking";

export type { RankedTier };
export type ShowType = "musical" | "play" | "opera" | "dance" | "revue" | "comedy" | "magic" | "other";

export type RankedShowForRanking = {
  _id: Id<"shows">;
  name: string;
  images: string[];
  tier?: string;
  isUnranked?: boolean;
  type?: ShowType;
};

export type UserShowStatus = {
  _id: Id<"shows">;
  tier?: string;
  visitCount?: number;
  isUnranked?: boolean;
};

export type AddVisitFormState = {
  query: string;
  selectedShowId: Id<"shows"> | null;
  customShowName: string | null;
  date: string;
  selectedProductionId: Id<"productions"> | null;
  useOtherProduction: boolean;
  city: string;
  theatre: string;
  seat: string;
  notes: string;
  isSaving: boolean;
  keepCurrentRanking: boolean;
  selectedTier: RankedTier | null;
  searchLow: number;
  searchHigh: number;
  rankingResultIndex: number | null;
  /**
   * Indices (within the current tier comparison list) that the user has temporarily
   * skipped for the *current* binary-search step. Cleared whenever the search window
   * advances (low/high change) or the flow is reset.
   */
  skippedComparisonIndices: number[];
  taggedUserIds: Id<"users">[];
  taggedGuestNames: string[];
};
