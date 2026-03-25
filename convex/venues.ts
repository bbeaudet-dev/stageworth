import { v } from "convex/values";
import { action, internalQuery, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type VenueDistrict =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

type SeedVenue = {
  name: string;
  district: VenueDistrict;
  city: string;
  state?: string;
  country: string;
  addressLine1?: string;
  source: string;
  sourceUrl: string;
  ingestionConfidence: "high" | "medium" | "low";
};

function normalizeVenueName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BROADWAY_SOURCE_URL = "https://www.broadway.org/broadway-theatres";
const OFF_BROADWAY_SOURCE_URL = "https://www.newyorktheatreguide.com/venues/off-broadway";

// Batch 1 seed set:
// - Full Broadway theatre list by name
// - Initial Off/Off-Off entries from the first NYTG page
const INITIAL_VENUE_SEED: SeedVenue[] = [
  // Broadway
  { name: "Al Hirschfeld Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ambassador Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "August Wilson Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Belasco Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Bernard B. Jacobs Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Booth Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Broadhurst Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Broadway Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Circle in the Square Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ethel Barrymore Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Eugene O'Neill Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Gershwin Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Hudson Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Imperial Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "James Earl Jones Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "John Golden Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lena Horne Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Longacre Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lunt-Fontanne Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lyceum Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lyric Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Majestic Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Marquis Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Minskoff Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Music Box Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Nederlander Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Neil Simon Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "New Amsterdam Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Palace Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Richard Rodgers Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Samuel J. Friedman Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Gerald Schoenfeld Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Shubert Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "St. James Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Stephen Sondheim Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Studio 54", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Todd Haimes Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Vivian Beaumont Theater", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Walter Kerr Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Winter Garden Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Hayes Theater", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },

  // Off / Off-Off Broadway (first page batch)
  { name: "54 Below", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "254 West 54th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Anne L. Bernstein Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "210 West 50th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Apollo Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "253 West 125th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Astor Place Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "434 Lafayette Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Asylum NYC", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "123 E 24th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "low" },
  { name: "Atlantic Stage 2", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "330 West 16th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Atlantic Theater Company - Linda Gross Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "336 West 20th Street", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Audible's Minetta Lane Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "18 Minetta Lane", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "BAM Howard Gilman Opera House", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "30 Lafayette Avenue", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "medium" },
  { name: "Bowery Palace", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "327 Bowery", source: "newyorktheatreguide", sourceUrl: OFF_BROADWAY_SOURCE_URL, ingestionConfidence: "low" },
];

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
