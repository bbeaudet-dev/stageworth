import rawSnapshot from "../../data/showtimes/current.json";
import { normalizeShowName } from "../../convex/showNormalization";

export type BroadwayDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type BroadwayShowtimesSchedule = Record<BroadwayDayKey, string[]>;

export type BroadwayShowtimesResult = {
  weekOf: string;
  schedule: BroadwayShowtimesSchedule;
};

const DAY_ORDER: BroadwayDayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Remove parentheticals (e.g. subtitle) so "Two Strangers (Carry a Cake...)" ↔ "Two Strangers". */
function stripParentheticalContent(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** Drop tour / non–Broadway suffixes often present in catalog titles. */
function stripTourishSuffix(s: string): string {
  return s
    .replace(/\s*[—–-]\s*(tour|touring|non[- ]equity|n\s*[\/\u2215]y|national tour).*/i, "")
    .trim();
}

/** Extra title variants we index so app show names match Playbill rows. */
function indexKeysForPlaybillTitle(title: string): string[] {
  const keys = new Set<string>();
  keys.add(normalizeShowName(title));
  keys.add(normalizeShowName(stripParentheticalContent(title)));
  const withMusical = `${stripParentheticalContent(title)} The Musical`;
  keys.add(normalizeShowName(withMusical));
  return [...keys].filter(Boolean);
}

function buildScheduleByNormalizedTitle(): Map<string, BroadwayShowtimesSchedule> {
  const map = new Map<string, BroadwayShowtimesSchedule>();
  const snapshot = rawSnapshot as {
    weekOf?: string;
    shows?: { title: string; schedule: BroadwayShowtimesSchedule }[];
  };
  for (const row of snapshot.shows ?? []) {
    for (const k of indexKeysForPlaybillTitle(row.title)) {
      if (!map.has(k)) map.set(k, row.schedule);
    }
  }
  return map;
}

const scheduleByNormalizedTitle = buildScheduleByNormalizedTitle();

/** Variants of the user's show name to try against the Playbill index. */
function lookupKeysForUserShowName(showName: string): string[] {
  const keys = new Set<string>();
  const bases = new Set<string>();
  const s0 = showName.trim();
  bases.add(s0);
  bases.add(stripParentheticalContent(s0));
  bases.add(s0.replace(/:\s*the musical\s*$/i, "").trim());
  bases.add(stripParentheticalContent(s0).replace(/:\s*the musical\s*$/i, "").trim());
  bases.add(stripTourishSuffix(s0));
  bases.add(stripTourishSuffix(stripParentheticalContent(s0)));

  for (const base of bases) {
    let s = base.trim();
    if (!s) continue;
    keys.add(normalizeShowName(s));
    s = s.replace(/\s*[,-]?\s*the musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
    s = s.replace(/\s+a new musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
  }
  return [...keys].filter(Boolean);
}

/**
 * Broadway (Playbill) weekly times for a show, or null if not in the snapshot
 * or if snapshot has no usable data.
 */
export function findBroadwayShowtimes(showName: string): BroadwayShowtimesResult | null {
  const snapshot = rawSnapshot as {
    weekOf?: string;
    shows?: unknown[];
  };
  if (!snapshot.weekOf || !Array.isArray(snapshot.shows) || snapshot.shows.length === 0) {
    return null;
  }

  for (const key of lookupKeysForUserShowName(showName)) {
    const schedule = scheduleByNormalizedTitle.get(key);
    if (schedule) {
      return { weekOf: snapshot.weekOf, schedule };
    }
  }
  return null;
}

export { DAY_ORDER as BROADWAY_SHOWTIMES_DAY_ORDER };

export function formatBroadwaySlotLabel(slot: string): string {
  if (slot === "opening") return "Opening";
  const m = slot.match(/^(\d{2}):(\d{2})$/);
  if (!m) return slot;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const am = hour < 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = am ? "AM" : "PM";
  if (minute === 0) return `${hour12} ${ampm}`;
  return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
}
