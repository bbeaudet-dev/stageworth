import { useAction } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type CompareUrgency = "closing_soon" | "open_run" | "standard";

export type ComparePick = {
  showId: Id<"shows">;
  showName: string;
  showType: string;
  posterUrl: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  urgency: CompareUrgency;
  headline: string;
  reasoning: string;
};

export type CompareResult =
  | {
      kind: "ok";
      winner: ComparePick;
      runnersUp: ComparePick[];
    }
  | {
      kind: "insufficient_context";
      reason: string;
    };

export function useCompareShows() {
  const compareShowsForUser = useAction(api.compareShows.compareShowsForUser);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (args: {
      showIds: Id<"shows">[];
      tripStartDate?: string;
      tripEndDate?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = (await compareShowsForUser({
          showIds: args.showIds,
          tripStartDate: args.tripStartDate,
          tripEndDate: args.tripEndDate,
        })) as CompareResult;
        setResult(res);
      } catch (e) {
        setError(
          e instanceof Error && e.message
            ? e.message
            : "Something went wrong. Try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [compareShowsForUser]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
