import { useAction } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type FindShowUrgency = "closing_soon" | "open_run" | "standard";

export type FindShowPick = {
  showId: Id<"shows">;
  showName: string;
  showType: string;
  posterUrl: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  urgency: FindShowUrgency;
  headline: string;
  reasoning: string;
};

export type FindShowResult =
  | {
      kind: "ok";
      anchorDate: string;
      hasTargetDate: boolean;
      primary: FindShowPick;
      alternates: FindShowPick[];
    }
  | {
      kind: "insufficient_context";
      anchorDate: string;
      hasTargetDate: boolean;
      reason: string;
    };

export function useFindShow() {
  const findShowForUser = useAction(api.findShow.findShowForUser);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FindShowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (args: { targetDate?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const res = (await findShowForUser({
          targetDate: args.targetDate,
        })) as FindShowResult;
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
    [findShowForUser]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
