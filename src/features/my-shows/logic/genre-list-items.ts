import type { RankedShow } from "@/components/show-row-accordion";
import type { ShowType } from "@/features/add-visit/types";
import { SHOW_TYPE_COLORS } from "@/constants/showTypeColors";
import type { GenreListItem, RankingTier } from "@/features/my-shows/types";

/**
 * Display order for genre groups. Musicals lead, then plays, dance, comedy,
 * followed by remaining types. Any unrecognised types fall through to "other".
 */
const GENRE_ORDER: ShowType[] = [
  "musical",
  "play",
  "dance",
  "opera",
  "revue",
  "comedy",
  "magic",
  "other",
];

function normaliseType(type: string | undefined | null): ShowType {
  if (type && type in SHOW_TYPE_COLORS) return type as ShowType;
  return "other";
}

/**
 * Build a flat list of items grouped by show type, preserving each show's
 * relative order from the global ranked list while collapsing rank labels to
 * sequential numbers within each genre. Unranked shows appear at the bottom of
 * their genre with a dash label.
 */
export function buildMyShowsGenreItems({
  shows,
  getShowTier,
}: {
  shows: RankedShow[];
  getShowTier: (show: RankedShow) => RankingTier;
}): GenreListItem[] {
  const groups = new Map<ShowType, RankedShow[]>();
  for (const show of shows) {
    const type = normaliseType(show.type);
    const bucket = groups.get(type);
    if (bucket) bucket.push(show);
    else groups.set(type, [show]);
  }

  const items: GenreListItem[] = [];
  const seen = new Set<ShowType>();

  const emitGroup = (type: ShowType) => {
    const bucket = groups.get(type);
    if (!bucket || bucket.length === 0) return;
    seen.add(type);

    const ranked: RankedShow[] = [];
    const unranked: RankedShow[] = [];
    for (const show of bucket) {
      if (getShowTier(show) === "unranked") unranked.push(show);
      else ranked.push(show);
    }

    items.push({
      key: `genre-${type}`,
      kind: "genre",
      type,
      label: SHOW_TYPE_COLORS[type].label,
      count: bucket.length,
    });

    ranked.forEach((show, index) => {
      items.push({
        key: `genre-${type}-${show._id}`,
        kind: "show",
        show,
        rankLabel: `#${index + 1}`,
      });
    });

    for (const show of unranked) {
      items.push({
        key: `genre-${type}-${show._id}`,
        kind: "show",
        show,
        rankLabel: "—",
      });
    }
  };

  for (const type of GENRE_ORDER) emitGroup(type);
  for (const type of groups.keys()) {
    if (!seen.has(type)) emitGroup(type);
  }

  return items;
}
