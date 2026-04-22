/**
 * Shared tier badge colour scale.
 *
 * Used wherever show quality tiers (Loved It → Unranked) appear:
 *   - My Shows rank view section header pills  (MyShowsScreen)
 *   - Add Visit ranking selection buttons       (RankingSection)
 *   - Any future show-card tier indicator
 *
 * Design intent: single brand blue/purple hue family fading to neutral.
 * No traffic-light associations (no red/green/yellow).
 */
import type { RankingTier, RankedTier } from "@/types/ranking";

export type TierColorEntry = {
  /** Solid background (also serves as the button/pill background). */
  bg: string;
  /** Border colour — slightly darker/more saturated than bg. */
  border: string;
  /** Text colour that passes WCAG AA against bg. */
  text: string;
  /** Display label used in all badge and button contexts. */
  label: string;
};

/** Full colour scale including "unranked". */
export const TIER_COLORS: Record<RankingTier, TierColorEntry> = {
  loved:    { bg: "#536DFE", border: "#3355E0", text: "#FFFFFF", label: "Loved It" },
  liked:    { bg: "#7B8EFE", border: "#536DFE", text: "#FFFFFF", label: "Liked It" },
  okay:     { bg: "#B9C2FD", border: "#8B9AFE", text: "#1E3399", label: "It Was Okay" },
  disliked: { bg: "#ECE8F6", border: "#C4B8E8", text: "#6B51A8", label: "Disliked It" },
  unranked: { bg: "#EBEBED", border: "#D1D5DB", text: "#7B7B86", label: "Unranked" },
};

/** Ranked-only subset (no "unranked") for convenience in Add Visit contexts. */
export const RANKED_TIER_COLORS: Record<RankedTier, TierColorEntry> = {
  loved:    TIER_COLORS.loved,
  liked:    TIER_COLORS.liked,
  okay:     TIER_COLORS.okay,
  disliked: TIER_COLORS.disliked,
};
