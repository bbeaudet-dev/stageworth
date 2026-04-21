import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RankedTier } from "@/features/add-visit/types";

export type SuggestedRankingState =
  | { status: "idle" }
  | { status: "predicting_tier" }
  | {
      status: "tier_ready";
      tier: RankedTier;
      tierReasoning: string;
    }
  | {
      status: "ready";
      tier: RankedTier;
      tierReasoning: string;
      relativeIndex: number;
      tierLength: number;
      positionReasoning: string;
    }
  | { status: "unavailable"; reason: string };

/**
 * Drives the two-step "Suggested Ranking" engine for the Add Visit flow:
 *
 *   1. Predict a tier (streamed to UI first).
 *   2. Predict a relative position within that tier.
 *
 * Sequential so the UI can reveal the tier immediately while the position
 * call is still in flight. Each show change bumps a generation counter so
 * late responses from stale requests are dropped.
 */
export function useSuggestedRanking(showId: Id<"shows"> | null) {
  const predictTier = useAction(api.suggestedRanking.predictSuggestedTier);
  const predictPosition = useAction(
    api.suggestedRanking.predictSuggestedPosition,
  );

  const [state, setState] = useState<SuggestedRankingState>({ status: "idle" });
  const generationRef = useRef(0);
  /**
   * Per-show cache so hitting "Change" (which hides and re-shows the card)
   * doesn't re-bill the AI for the same show. Cleared on explicit refresh.
   */
  const cacheRef = useRef(new Map<Id<"shows">, SuggestedRankingState>());

  const run = useCallback(
    async (targetShowId: Id<"shows">, { ignoreCache }: { ignoreCache?: boolean } = {}) => {
      const myGen = ++generationRef.current;

      if (!ignoreCache) {
        const cached = cacheRef.current.get(targetShowId);
        if (cached && cached.status !== "idle" && cached.status !== "predicting_tier") {
          setState(cached);
          return;
        }
      }

      setState({ status: "predicting_tier" });

      const finalize = (next: SuggestedRankingState) => {
        cacheRef.current.set(targetShowId, next);
        setState(next);
      };

      try {
        const tierRes = await predictTier({ showId: targetShowId });
        if (myGen !== generationRef.current) return;
        if (tierRes.kind !== "ok") {
          finalize({ status: "unavailable", reason: tierRes.reason });
          return;
        }
        const tierOnly: SuggestedRankingState = {
          status: "tier_ready",
          tier: tierRes.tier,
          tierReasoning: tierRes.reasoning,
        };
        setState(tierOnly);

        const posRes = await predictPosition({
          showId: targetShowId,
          tier: tierRes.tier,
        });
        if (myGen !== generationRef.current) return;
        if (posRes.kind !== "ok") {
          finalize(tierOnly);
          return;
        }
        finalize({
          status: "ready",
          tier: tierRes.tier,
          tierReasoning: tierRes.reasoning,
          relativeIndex: posRes.relativeIndex,
          tierLength: posRes.tierLength,
          positionReasoning: posRes.reasoning,
        });
      } catch (err) {
        if (myGen !== generationRef.current) return;
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        finalize({ status: "unavailable", reason: message });
      }
    },
    [predictTier, predictPosition],
  );

  useEffect(() => {
    if (!showId) {
      generationRef.current += 1;
      setState({ status: "idle" });
      return;
    }
    run(showId);
  }, [showId, run]);

  const refresh = useCallback(() => {
    if (!showId) return;
    cacheRef.current.delete(showId);
    run(showId, { ignoreCache: true });
  }, [run, showId]);

  return { state, refresh };
}
