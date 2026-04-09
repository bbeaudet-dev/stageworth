import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { normalizeShowName } from "./showNormalization";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklySchedule = {
  weekOf: string;
  mon: string[];
  tue: string[];
  wed: string[];
  thu: string[];
  fri: string[];
  sat: string[];
  sun: string[];
};

type PlaybillShow = {
  title: string;
  schedule: {
    mon: string[];
    tue: string[];
    wed: string[];
    thu: string[];
    fri: string[];
    sat: string[];
    sun: string[];
  };
};

// ─── Title normalization helpers (mirrors src/lib/broadwayShowtimes.ts) ───────

function stripParentheticalContent(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function stripTourishSuffix(s: string): string {
  return s
    .replace(/\s*[—–-]\s*(tour|touring|non[- ]equity|n\s*[/\u2215]y|national tour).*/i, "")
    .trim();
}

/**
 * Generate all normalized key variants for a Playbill title so we can match
 * against show.normalizedName in our database.
 */
function indexKeysForPlaybillTitle(title: string): string[] {
  const keys = new Set<string>();

  const stripped = stripParentheticalContent(title);
  const noTour = stripTourishSuffix(title);
  const strippedNoTour = stripTourishSuffix(stripped);

  for (const base of [title, stripped, noTour, strippedNoTour]) {
    if (!base) continue;
    let s = base.trim();
    keys.add(normalizeShowName(s));
    s = s.replace(/\s*[,-]?\s*the musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
    s = s.replace(/\s+a new musical\s*$/i, "").trim();
    keys.add(normalizeShowName(s));
    // Also try appending "The Musical" for titles that omit it in Playbill
    keys.add(normalizeShowName(`${base} The Musical`));
  }

  return [...keys].filter(Boolean);
}

// ─── Internal mutation ────────────────────────────────────────────────────────

export const syncWeeklyShowtimes = internalMutation({
  args: {
    weekOf: v.string(),
    shows: v.array(
      v.object({
        title: v.string(),
        schedule: v.object({
          mon: v.array(v.string()),
          tue: v.array(v.string()),
          wed: v.array(v.string()),
          thu: v.array(v.string()),
          fri: v.array(v.string()),
          sat: v.array(v.string()),
          sun: v.array(v.string()),
        }),
      })
    ),
  },
  handler: async (ctx, { weekOf, shows }) => {
    // Fetch all open Broadway productions joined to their show's normalizedName.
    // "Open" = no closingDate OR closingDate >= today AND not explicitly closed.
    const today = new Date().toISOString().slice(0, 10);

    const broadwayProductions = await ctx.db
      .query("productions")
      .withIndex("by_district", (q) => q.eq("district", "broadway"))
      .collect();

    // Build a map: normalizedShowName → productionId for currently-open Broadway shows
    const normalizedToProductionId = new Map<string, string>();

    for (const prod of broadwayProductions) {
      if (prod.isClosed) continue;
      if (prod.closingDate && prod.closingDate < today) continue;

      const show = await ctx.db.get(prod.showId);
      if (!show) continue;

      // Index using the show's stored normalizedName
      normalizedToProductionId.set(show.normalizedName, prod._id);

      // Also index extra variants of the show name in case Playbill uses a
      // slightly different title than what's stored in our DB
      for (const key of indexKeysForPlaybillTitle(show.name)) {
        if (!normalizedToProductionId.has(key)) {
          normalizedToProductionId.set(key, prod._id);
        }
      }
    }

    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const playbillShow of shows as PlaybillShow[]) {
      const lookupKeys = indexKeysForPlaybillTitle(playbillShow.title);
      let productionId: string | undefined;

      for (const key of lookupKeys) {
        const id = normalizedToProductionId.get(key);
        if (id) {
          productionId = id;
          break;
        }
      }

      if (!productionId) {
        unmatched.push(playbillShow.title);
        continue;
      }

      await ctx.db.patch(productionId as never, {
        weeklySchedule: {
          weekOf,
          ...playbillShow.schedule,
        },
      });

      matched.push(playbillShow.title);
    }

    console.log(
      `[showtimes] weekOf=${weekOf} matched=${matched.length} unmatched=${unmatched.length}`
    );
    if (unmatched.length > 0) {
      console.warn(`[showtimes] Unmatched Playbill titles: ${unmatched.join(", ")}`);
    }

    return { weekOf, matched, unmatched };
  },
});
