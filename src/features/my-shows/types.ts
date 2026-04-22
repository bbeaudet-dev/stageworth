import type { Id } from "@/convex/_generated/dataModel";
import type { RankedShow } from "@/components/show-row-accordion";
import type { ShowType } from "@/features/add-visit/types";
import type { RankedTier, RankingTier } from "@/types/ranking";

export type { RankedTier, RankingTier };
export type ViewMode = "rank" | "cloud" | "diary" | "genre";
export type SpecialLine = "wouldSeeAgain" | "stayedHome";

export type ListItem =
  | { key: string; kind: "show"; show: RankedShow }
  | { key: string; kind: "line"; line: SpecialLine }
  | { key: string; kind: "tier"; tier: RankingTier };

export type GenreListItem =
  | { key: string; kind: "genre"; type: ShowType; label: string; count: number }
  | { key: string; kind: "show"; show: RankedShow; rankLabel: string };

export type TierHeaderMeta = { label: string; color: string; textColor: string };
export type LineMeta = { label: string; color: string; arrow: string };

export type SelectedShowId = Id<"shows"> | null;
