import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { normalizeShowName } from "../showNormalization";
import type { Id } from "../_generated/dataModel";

// Mirrors the district union stored in the DB.
type DistrictValue =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

type TierValue = "loved" | "liked" | "okay" | "disliked" | "unranked";

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("other")
);

const districtValidator = v.union(
  v.literal("broadway"),
  v.literal("off_broadway"),
  v.literal("off_off_broadway"),
  v.literal("west_end"),
  v.literal("touring"),
  v.literal("regional"),
  v.literal("other")
);

function deriveTier(
  rank: number,
  breakpoints: { lovedThrough: number; likedThrough: number; okayThrough: number }
): TierValue {
  if (rank <= breakpoints.lovedThrough) return "loved";
  if (rank <= breakpoints.likedThrough) return "liked";
  if (rank <= breakpoints.okayThrough) return "okay";
  return "disliked";
}

/**
 * Seeds a user's rankings, userShows, and visits from structured show data.
 *
 * Intended for developer use via `npx convex run admin/seedUserData:seedUserRankingsAndVisits`.
 *
 * For each visit, attempts best-effort enrichment:
 *   1. Venue match: looks up the theatre string in the venues table (by normalizedName or aliases)
 *   2. Production match: if venue found, queries productions for showId + date overlap
 *   3. Fallback: stores visit with raw theatre string/district if no match
 *
 * Returns a stats summary so you can verify how much enrichment succeeded.
 */
export const seedUserRankingsAndVisits = internalMutation({
  args: {
    userId: v.id("users"),
    shows: v.array(
      v.object({
        name: v.string(),
        type: showTypeValidator,
        rank: v.number(),
        visits: v.array(
          v.object({
            date: v.string(),
            theatre: v.string(),
            district: districtValidator,
            notes: v.optional(v.string()),
          })
        ),
      })
    ),
    tierBreakpoints: v.object({
      lovedThrough: v.number(),
      likedThrough: v.number(),
      okayThrough: v.number(),
    }),
    // When true, skip seeding entirely if the user already has ranked shows.
    skipIfExists: v.optional(v.boolean()),
    // When true, log what would happen without writing any data.
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, shows, tierBreakpoints, skipIfExists, dryRun } = args;
    const isDryRun = dryRun ?? false;

    // Idempotency guard: bail out if user already has ranking data.
    const existingRankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (skipIfExists && existingRankings && existingRankings.showIds.length > 0) {
      return {
        skipped: true,
        reason: `User already has ${existingRankings.showIds.length} ranked shows. Pass skipIfExists: false to overwrite.`,
        showsCreated: 0,
        showsExisting: 0,
        visitsCreated: 0,
        venueMatched: 0,
        productionMatched: 0,
        rawOnly: 0,
        errors: [] as string[],
      };
    }

    // Sort ascending by rank so showIds array reflects correct order.
    const sortedShows = [...shows].sort((a, b) => a.rank - b.rank);

    let showsCreated = 0;
    let showsExisting = 0;
    let visitsCreated = 0;
    let venueMatched = 0;
    let productionMatched = 0;
    let rawOnly = 0;
    const errors: string[] = [];
    // Shows resolved via fuzzy match (score < 1.0) — logged for transparency.
    const fuzzyMatched: { inputName: string; matchedName: string; score: number }[] = [];
    // Shows with no match even after fuzzy — would be created.
    const wouldCreate: { name: string; normalizedName: string }[] = [];

    // ── Pass 1: exact normalized-name lookup ──────────────────────────────────
    // Fast index lookup. Collect anything that misses for the fuzzy pass.
    const exactHits = new Map<string, Id<"shows">>();
    const needsFuzzy: (typeof sortedShows)[number][] = [];

    for (const show of sortedShows) {
      const normalizedName = normalizeShowName(show.name);
      const existing = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
        .first();
      if (existing) {
        exactHits.set(show.name, existing._id);
      } else {
        needsFuzzy.push(show);
      }
    }

    // ── Pass 2: fuzzy match for anything that didn't resolve exactly ──────────
    // Uses the same scoring logic as the Playbill paste import tool.
    const fuzzyHits = new Map<string, { showId: Id<"shows">; score: number; matchedName: string }>();

    if (needsFuzzy.length > 0) {
      const suggestions = await ctx.runQuery(
        internal.admin.seed.suggestShowMatchesForNames,
        { names: needsFuzzy.map((s) => s.name), limitPerName: 3 }
      );
      for (const suggestion of suggestions) {
        const best = suggestion.matches[0];
        // Accept any match with score >= 0.6; flag low-confidence ones in output.
        if (best && best.score >= 0.6) {
          fuzzyHits.set(suggestion.query, {
            showId: best.showId as Id<"shows">,
            score: best.score,
            matchedName: best.name,
          });
        }
      }
    }

    // ── Build resolved list ───────────────────────────────────────────────────
    const resolvedShows: { showId: Id<"shows">; show: (typeof sortedShows)[0] }[] = [];

    for (const show of sortedShows) {
      const exactId = exactHits.get(show.name);
      if (exactId) {
        showsExisting++;
        resolvedShows.push({ showId: exactId, show });
        continue;
      }

      const fuzzy = fuzzyHits.get(show.name);
      if (fuzzy) {
        showsExisting++;
        fuzzyMatched.push({
          inputName: show.name,
          matchedName: fuzzy.matchedName,
          score: Math.round(fuzzy.score * 100) / 100,
        });
        resolvedShows.push({ showId: fuzzy.showId, show });
        continue;
      }

      // No match at all.
      const normalizedName = normalizeShowName(show.name);
      if (isDryRun) {
        wouldCreate.push({ name: show.name, normalizedName });
        showsCreated++;
      } else {
        try {
          // Inline find-or-create: mutations can't call ctx.runMutation (actions only).
          const showId = await ctx.db.insert("shows", {
            name: show.name,
            normalizedName,
            type: show.type,
            images: [],
            isUserCreated: false,
            externalSource: "seed",
          });
          showsCreated++;
          resolvedShows.push({ showId, show });
        } catch (err) {
          errors.push(`Failed to create show "${show.name}": ${String(err)}`);
        }
      }
    }

    if (isDryRun) {
      const totalVisits = sortedShows.reduce((sum, s) => sum + s.visits.length, 0);
      return {
        skipped: false,
        dryRun: true,
        showsCreated,
        showsExisting,
        fuzzyMatched,
        wouldCreate,
        visitsCreated: totalVisits,
        venueMatched: 0,
        productionMatched: 0,
        rawOnly: totalVisits,
        errors,
      };
    }

    // Build ordered showIds array for userRankings.
    const orderedShowIds = resolvedShows.map(({ showId }) => showId);

    // Upsert userRankings document.
    if (existingRankings) {
      await ctx.db.patch(existingRankings._id, { showIds: orderedShowIds });
    } else {
      await ctx.db.insert("userRankings", {
        userId,
        showIds: orderedShowIds,
      });
    }

    // Insert/replace userShows records and visits for each show.
    for (const { showId, show } of resolvedShows) {
      const tier = deriveTier(show.rank, tierBreakpoints);

      // Remove any pre-existing userShows record to avoid duplicates.
      const existingUserShow = await ctx.db
        .query("userShows")
        .withIndex("by_user_show", (q) => q.eq("userId", userId).eq("showId", showId))
        .first();
      if (existingUserShow) {
        await ctx.db.delete(existingUserShow._id);
      }

      await ctx.db.insert("userShows", {
        userId,
        showId,
        tier,
        addedAt: Date.now(),
      });

      // Process visits.
      for (const visit of show.visits) {
        // Step 1: Venue match by normalized name or aliases.
        let venueId: Id<"venues"> | undefined;
        let matchedVenueName: string | undefined;

        const normalizedTheatre = visit.theatre
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const venueByName = await ctx.db
          .query("venues")
          .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedTheatre))
          .first();

        if (venueByName) {
          venueId = venueByName._id;
          matchedVenueName = venueByName.name;
          venueMatched++;
        } else {
          // Fallback: scan for alias match (aliases aren't indexed, so we query by city
          // heuristic first, then check aliases array).
          const cityFromDistrict = getCityHintFromDistrict(visit.district);
          const candidateVenues = cityFromDistrict
            ? await ctx.db
                .query("venues")
                .withIndex("by_city", (q) => q.eq("city", cityFromDistrict))
                .collect()
            : await ctx.db.query("venues").collect();

          for (const candidate of candidateVenues) {
            const aliases = candidate.aliases ?? [];
            const normalizedAliases = aliases.map((a) =>
              a
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            );
            if (normalizedAliases.includes(normalizedTheatre)) {
              venueId = candidate._id;
              matchedVenueName = candidate.name;
              venueMatched++;
              break;
            }
          }
        }

        // Step 2: Production match — needs venueId + showId + date overlap.
        let productionId: Id<"productions"> | undefined;

        if (venueId) {
          const productions = await ctx.db
            .query("productions")
            .withIndex("by_show", (q) => q.eq("showId", showId))
            .collect();

          const matchingProduction = productions.find((prod) => {
            // Must be at the same venue (via theatre name match, since productions
            // store theatre as a string, not a venueId FK).
            const prodTheatreNorm = (prod.theatre ?? "")
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (matchedVenueName) {
              const venueNorm = matchedVenueName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              if (prodTheatreNorm !== venueNorm && prodTheatreNorm !== normalizedTheatre) {
                return false;
              }
            }

            // Date must fall within the production's run (use preview date as earliest bound).
            const runStart = prod.previewDate ?? prod.openingDate;
            const runEnd = prod.closingDate;

            if (!runStart) return false; // Can't validate without a start date.

            const visitDate = visit.date;
            if (visitDate < runStart) return false;
            if (runEnd && visitDate > runEnd) return false;

            return true;
          });

          if (matchingProduction) {
            productionId = matchingProduction._id;
            productionMatched++;
          }
        }

        if (!venueId && !productionId) {
          rawOnly++;
        }

        await ctx.db.insert("visits", {
          userId,
          showId,
          productionId,
          venueId,
          date: visit.date,
          theatre: visit.theatre,
          district: visit.district as DistrictValue,
          notes: visit.notes,
        });

        visitsCreated++;
      }
    }

    return {
      skipped: false,
      dryRun: false,
      showsCreated,
      showsExisting,
      fuzzyMatched,
      wouldCreate: [] as { name: string; normalizedName: string }[],
      visitsCreated,
      venueMatched,
      productionMatched,
      rawOnly,
      errors,
    };
  },
});

/**
 * Maps a Convex district value to the most likely city name for venue lookups.
 * Broadway/off-Broadway/off-off-Broadway all point to New York.
 */
function getCityHintFromDistrict(district: DistrictValue): string | null {
  switch (district) {
    case "broadway":
    case "off_broadway":
    case "off_off_broadway":
      return "New York";
    case "west_end":
      return "London";
    default:
      return null;
  }
}
