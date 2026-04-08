import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { getProductionStatus, isProductionBrowseVisible } from "@/utils/productions";
import type { BrowseSection, ProductionWithShow } from "@/features/browse/types";

export function useBrowseData(search: string) {
  const allProductions = useQuery(api.productions.listAll);
  const allShows = useQuery(api.shows.list);
  const today = new Date().toISOString().split("T")[0];

  const visibleProductions = useMemo(() => {
    return ((allProductions ?? []) as ProductionWithShow[]).filter((p) => {
      if (!isProductionBrowseVisible(p, today)) return false;
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
          data: (() => {
            const open = visibleProductions.filter((p) => getProductionStatus(p, today) === "open");
            // Productions with a closing date within 30 days float to the top, sorted soonest-first.
            const closingSoon = open
              .filter((p) => {
                if (!p.closingDate || p.closingDate < today) return false;
                const ms = new Date(p.closingDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime();
                return Math.ceil(ms / (1000 * 60 * 60 * 24)) <= 30;
              })
              .sort((a, b) => (a.closingDate ?? "").localeCompare(b.closingDate ?? ""));
            const closingSoonSet = new Set(closingSoon.map((p) => p._id));
            const rest = open.filter((p) => !closingSoonSet.has(p._id));
            return [...closingSoon, ...rest];
          })(),
        },
        {
          title: "In Previews",
          data: visibleProductions.filter((p) => getProductionStatus(p, today) === "in_previews"),
        },
        {
          title: "Upcoming",
          data: visibleProductions.filter((p) => getProductionStatus(p, today) === "announced"),
        },
      ].filter((s) => s.data.length > 0),
    [today, visibleProductions]
  );

  const shows = useMemo(
    () => {
      if (!allShows) return undefined;
      const trimmed = search.trim().toLowerCase();
      const base = [...allShows].sort((a, b) => a.name.localeCompare(b.name));
      if (!trimmed) return base;
      return base.filter((show) => show.name.toLowerCase().includes(trimmed));
    },
    [allShows, search]
  );

  return {
    allProductions,
    sections,
    shows,
    currentCount: visibleProductions.length,
    allCount: allShows?.length ?? 0,
  };
}
