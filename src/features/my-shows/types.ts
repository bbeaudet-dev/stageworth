import type { Id } from "@/convex/_generated/dataModel";
import type { RankedShow } from "@/components/show-row-accordion";

export type ViewMode = "list" | "cloud" | "diary";
export type RankingTier = "loved" | "liked" | "okay" | "disliked" | "unranked";
export type RankedTier = Exclude<RankingTier, "unranked">;
export type SpecialLine = "wouldSeeAgain" | "stayedHome";

export type ListItem =
  | { key: string; kind: "show"; show: RankedShow }
  | { key: string; kind: "line"; line: SpecialLine }
  | { key: string; kind: "tier"; tier: RankingTier };

export type TierHeaderMeta = { label: string; color: string; textColor: string };
export type LineMeta = { label: string; color: string; arrow: string };

export type SelectedShowId = Id<"shows"> | null;
