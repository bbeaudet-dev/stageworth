import type { Id } from "@/convex/_generated/dataModel";
import type { RankedTier } from "@/types/ranking";

export type { RankedTier };
export type ShowType = "musical" | "play" | "opera" | "dance" | "other";

export type RankedShowForRanking = {
  _id: Id<"shows">;
  name: string;
  images: string[];
  tier?: string;
  isUnranked?: boolean;
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
  notes: string;
  isSaving: boolean;
  keepCurrentRanking: boolean;
  selectedTier: RankedTier | null;
  searchLow: number;
  searchHigh: number;
  rankingResultIndex: number | null;
  taggedUserIds: Id<"users">[];
  /** Local image URIs; uploaded to Convex storage on save */
  photoUris: string[];
};
