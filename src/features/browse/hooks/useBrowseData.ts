import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { getProductionStatus } from "@/utils/productions";
import type { BrowseSection, ProductionWithShow } from "@/features/browse/types";

export function useBrowseData(search: string) {
  const allProductions = useQuery(api.productions.listAll);
  const today = new Date().toISOString().split("T")[0];

  const visible = useMemo(() => {
    return ((allProductions ?? []) as ProductionWithShow[]).filter((p) => {
      const status = getProductionStatus(p, today);
      if (status === "closed") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.show?.name?.toLowerCase().includes(q) || p.theatre?.toLowerCase().includes(q);
    });
  }, [allProductions, search, today]);

  const sections = useMemo<BrowseSection[]>(
    () =>
      [
        {
          title: "Now Running",
          data: visible.filter((p) => getProductionStatus(p, today) === "open"),
        },
        {
          title: "In Previews",
          data: visible.filter((p) => getProductionStatus(p, today) === "in_previews"),
        },
        {
          title: "Announced",
          data: visible.filter((p) => getProductionStatus(p, today) === "announced"),
        },
      ].filter((s) => s.data.length > 0),
    [today, visible]
  );

  return {
    allProductions,
    sections,
  };
}
