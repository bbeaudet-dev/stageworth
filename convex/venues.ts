import { v } from "convex/values";
import { action, internalQuery, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { INITIAL_VENUE_SEED } from "../data/venues-seed";

function normalizeVenueName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2) return [];
    const normalized = normalizeVenueName(q);
    if (!normalized) return [];

    const venues = await ctx.db.query("venues").collect();

    const queryWords = normalized.split(" ").filter((w) => w.length > 1);

    type ScoredVenue = {
      _id: string;
      name: string;
      city: string;
      state?: string;
      district: string;
      score: number;
    };
    const scored: ScoredVenue[] = [];

    for (const venue of venues) {
      if (!venue.isActive) continue;
      const n = venue.normalizedName;
      const c = venue.city.toLowerCase();
      let score = 0;

      // ── Name matching ──────────────────────────────────────────────────────
      if (n.startsWith(normalized)) {
        score = Math.max(score, 3);
      } else if (n.includes(normalized)) {
        score = Math.max(score, 2);
      } else {
        const nameWords = n.split(" ");
        if (queryWords.some((qw) => nameWords.some((nw) => nw.startsWith(qw)))) {
          score = Math.max(score, 1);
        }
      }

      // ── City matching (e.g. "detroit" surfaces all Detroit venues) ─────────
      if (c.startsWith(normalized)) {
        score = Math.max(score, 2.5);
      } else if (c.includes(normalized)) {
        score = Math.max(score, 1.5);
      } else {
        const cityWords = c.split(" ");
        if (queryWords.some((qw) => cityWords.some((cw) => cw.startsWith(qw)))) {
          score = Math.max(score, 0.5);
        }
      }

      if (score > 0) {
        scored.push({
          _id: venue._id as string,
          name: venue.name,
          city: venue.city,
          state: venue.state,
          district: venue.district,
          score,
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 30)
      .map(({ _id, name, city, state, district }) => ({ _id, name, city, state, district }));
  },
});

export const list = query({
  args: {
    district: v.optional(
      v.union(
        v.literal("broadway"),
        v.literal("off_broadway"),
        v.literal("off_off_broadway"),
        v.literal("west_end"),
        v.literal("touring"),
        v.literal("regional"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, args) => {
    const rows = args.district
      ? await ctx.db
          .query("venues")
          .withIndex("by_district", (q) => q.eq("district", args.district!))
          .collect()
      : await ctx.db.query("venues").collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listMissingCoordinates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").collect();
    return venues.filter((venue) => venue.latitude === undefined || venue.longitude === undefined);
  },
});

export const seedInitialCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const venue of INITIAL_VENUE_SEED) {
      const normalizedName = normalizeVenueName(venue.name);
      const existing = await ctx.db
        .query("venues")
        .withIndex("by_city_normalized_name", (q) =>
          q.eq("city", venue.city).eq("normalizedName", normalizedName)
        )
        .first();
      const now = Date.now();

      if (!existing) {
        await ctx.db.insert("venues", {
          name: venue.name,
          normalizedName,
          addressLine1: venue.addressLine1,
          city: venue.city,
          state: venue.state,
          country: venue.country,
          district: venue.district,
          source: venue.source,
          sourceUrl: venue.sourceUrl,
          ingestionConfidence: venue.ingestionConfidence,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
        continue;
      }

      await ctx.db.patch(existing._id, {
        district: venue.district,
        addressLine1: venue.addressLine1 ?? existing.addressLine1,
        state: venue.state ?? existing.state,
        country: venue.country,
        source: venue.source,
        sourceUrl: venue.sourceUrl,
        ingestionConfidence: venue.ingestionConfidence,
        isActive: true,
        updatedAt: now,
      });
      updated += 1;
    }

    return {
      seeded: INITIAL_VENUE_SEED.length,
      inserted,
      updated,
    };
  },
});

// Convenience wrapper for local/dev seeding from CLI:
// npx convex run venues:seedInitialCatalogDev
export const seedInitialCatalogDev = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const venue of INITIAL_VENUE_SEED) {
      const normalizedName = normalizeVenueName(venue.name);
      const existing = await ctx.db
        .query("venues")
        .withIndex("by_city_normalized_name", (q) =>
          q.eq("city", venue.city).eq("normalizedName", normalizedName)
        )
        .first();
      const now = Date.now();

      if (!existing) {
        await ctx.db.insert("venues", {
          name: venue.name,
          normalizedName,
          addressLine1: venue.addressLine1,
          city: venue.city,
          state: venue.state,
          country: venue.country,
          district: venue.district,
          source: venue.source,
          sourceUrl: venue.sourceUrl,
          ingestionConfidence: venue.ingestionConfidence,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      } else {
        await ctx.db.patch(existing._id, {
          district: venue.district,
          addressLine1: venue.addressLine1 ?? existing.addressLine1,
          state: venue.state ?? existing.state,
          country: venue.country,
          source: venue.source,
          sourceUrl: venue.sourceUrl,
          ingestionConfidence: venue.ingestionConfidence,
          isActive: true,
          updatedAt: now,
        });
        updated += 1;
      }
    }

    return { seeded: INITIAL_VENUE_SEED.length, inserted, updated };
  },
});

const backfillVenueArgsValidator = {
  limit: v.optional(v.number()),
};

export const patchVenueCoordinates = internalMutation({
  args: {
    venueId: v.id("venues"),
    latitude: v.number(),
    longitude: v.number(),
    googlePlaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.venueId, {
      latitude: args.latitude,
      longitude: args.longitude,
      googlePlaceId: args.googlePlaceId,
      updatedAt: Date.now(),
    });
  },
});

// Geocodes venues that are missing latitude/longitude and stores coordinates.
// Requires GOOGLE_MAPS_GEOCODING_API_KEY in Convex environment variables.
// Run with: npx convex run venues:backfillVenueCoordinates '{"limit":30}'
export const backfillVenueCoordinates: any = action({
  args: backfillVenueArgsValidator,
  handler: async (
    ctx,
    args
  ): Promise<{
    considered: number;
    updated: number;
    skipped: number;
    remainingWithoutCoordinates: number;
    errors: string[];
  }> => {
    const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_MAPS_GEOCODING_API_KEY in Convex environment");
    }

    const limit = Math.max(1, Math.min(args.limit ?? 30, 100));
    const venues = (await ctx.runQuery(internal.venues.listMissingCoordinates, {})) as Array<{
      _id: Id<"venues">;
      name: string;
      addressLine1?: string;
      city: string;
      state?: string;
      country: string;
    }>;

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const venue of venues.slice(0, limit)) {
      const queryParts = [venue.name, venue.addressLine1, venue.city, venue.state, venue.country].filter(
        Boolean
      );
      const query = queryParts.join(", ");
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
        );
        const payload = (await response.json()) as {
          status?: string;
          results?: Array<{
            place_id?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
          }>;
          error_message?: string;
        };
        const location = payload.results?.[0]?.geometry?.location;
        if (payload.status !== "OK" || location?.lat === undefined || location?.lng === undefined) {
          skipped += 1;
          errors.push(`${venue.name}: ${payload.status ?? "UNKNOWN"}${payload.error_message ? ` (${payload.error_message})` : ""}`);
          continue;
        }

        await ctx.runMutation(internal.venues.patchVenueCoordinates, {
          venueId: venue._id,
          latitude: location.lat,
          longitude: location.lng,
          googlePlaceId: payload.results?.[0]?.place_id,
        });
        updated += 1;
      } catch (error) {
        skipped += 1;
        errors.push(`${venue.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      considered: Math.min(limit, venues.length),
      updated,
      skipped,
      remainingWithoutCoordinates: Math.max(venues.length - Math.min(limit, venues.length), 0),
      errors,
    };
  },
});
