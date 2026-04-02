import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useEditVisitData(visitId: Id<"visits">) {
  const visit = useQuery(api.visits.getById, { visitId });
  const productions = useQuery(
    api.productions.listByShow,
    visit?.showId ? { showId: visit.showId } : "skip"
  );
  const myFollowing = useQuery(api.social.social.listMyFollowing, {});
  const updateVisitMutation = useMutation(api.visits.updateVisit);

  const productionOptions = productions ?? [];
  const hasOfficialProductions = productionOptions.length > 0;

  const updateVisit = useMemo(
    () =>
      (args: Parameters<typeof updateVisitMutation>[0]) =>
        updateVisitMutation(args),
    [updateVisitMutation]
  );

  return {
    visit: visit ?? null,
    productions,
    productionOptions,
    hasOfficialProductions,
    myFollowing: myFollowing ?? [],
    updateVisit,
  };
}
