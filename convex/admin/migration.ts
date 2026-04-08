import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ─── Export queries (run in dev) ─────────────────────────────────────────────

export const exportShows = internalQuery({
  args: {
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("shows").collect();
    const offset = args.offset ?? 0;
    const limit = args.limit ?? all.length;
    const page = all.slice(offset, offset + limit);

    return {
      total: all.length,
      offset,
      count: page.length,
      rows: page.map((s) => ({
        _devId: s._id,
        name: s.name,
        normalizedName: s.normalizedName,
        type: s.type,
        subtype: s.subtype,
        images: [], // storage IDs are deployment-specific
        hotlinkImageUrl: s.hotlinkImageUrl,
        hotlinkImageSource: s.hotlinkImageSource,
        wikipediaTitle: s.wikipediaTitle,
        ticketmasterAttractionId: s.ticketmasterAttractionId,
        isUserCreated: s.isUserCreated,
        externalSource: s.externalSource,
        externalId: s.externalId,
        sourceConfidence: s.sourceConfidence,
        dataStatus: s.dataStatus,
      })),
    };
  },
});

export const exportProductions = internalQuery({
  args: {
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allProductions = await ctx.db.query("productions").collect();
    const offset = args.offset ?? 0;
    const limit = args.limit ?? allProductions.length;
    const page = allProductions.slice(offset, offset + limit);

    const showCache = new Map<string, string>();
    async function getShowNormalizedName(showId: Id<"shows">): Promise<string | null> {
      const cached = showCache.get(showId);
      if (cached !== undefined) return cached;
      const show = await ctx.db.get(showId);
      const name = show?.normalizedName ?? null;
      if (name) showCache.set(showId, name);
      return name;
    }

    const rows = [];
    for (const p of page) {
      const showNormalizedName = await getShowNormalizedName(p.showId);
      rows.push({
        _devId: p._id,
        showNormalizedName,
        theatre: p.theatre,
        city: p.city,
        district: p.district,
        previewDate: p.previewDate,
        openingDate: p.openingDate,
        closingDate: p.closingDate,
        isOpenRun: p.isOpenRun,
        productionType: p.productionType,
        hotlinkPosterUrl: p.hotlinkPosterUrl,
        ticketmasterEventId: p.ticketmasterEventId,
        ticketmasterEventUrl: p.ticketmasterEventUrl,
        isUserCreated: p.isUserCreated,
        externalId: p.externalId,
        notes: p.notes,
        dataStatus: p.dataStatus,
      });
    }

    return {
      total: allProductions.length,
      offset,
      count: rows.length,
      rows,
    };
  },
});

export const exportVenues = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("venues").collect();
    return {
      total: all.length,
      rows: all.map((v) => ({
        _devId: v._id,
        name: v.name,
        normalizedName: v.normalizedName,
        aliases: v.aliases,
        addressLine1: v.addressLine1,
        city: v.city,
        state: v.state,
        postalCode: v.postalCode,
        country: v.country,
        district: v.district,
        latitude: v.latitude,
        longitude: v.longitude,
        googlePlaceId: v.googlePlaceId,
        source: v.source,
        sourceUrl: v.sourceUrl,
        ingestionConfidence: v.ingestionConfidence,
        isActive: v.isActive,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    };
  },
});

export const exportReviewQueue = internalQuery({
  args: {
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("reviewQueue").collect();
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 5000;
    const page = all.slice(offset, offset + limit);

    const showCache = new Map<string, { normalizedName: string }>();
    const prodCache = new Map<string, { theatre: string | undefined; showNormalizedName: string }>();

    async function resolveShowKey(entityId: string) {
      const cached = showCache.get(entityId);
      if (cached) return cached;
      const show = await ctx.db.get(entityId as Id<"shows">);
      if (!show) return null;
      const result = { normalizedName: show.normalizedName };
      showCache.set(entityId, result);
      return result;
    }

    async function resolveProdKey(entityId: string) {
      const cached = prodCache.get(entityId);
      if (cached) return cached;
      const prod = await ctx.db.get(entityId as Id<"productions">);
      if (!prod) return null;
      const show = await ctx.db.get(prod.showId);
      if (!show) return null;
      const result = { theatre: prod.theatre, showNormalizedName: show.normalizedName };
      prodCache.set(entityId, result);
      return result;
    }

    const rows = [];
    let unresolvedCount = 0;
    for (const entry of page) {
      let showNormalizedName: string | undefined;
      let productionTheatre: string | undefined;

      if (entry.entityType === "show") {
        const key = await resolveShowKey(entry.entityId);
        if (!key) { unresolvedCount++; continue; }
        showNormalizedName = key.normalizedName;
      } else {
        const key = await resolveProdKey(entry.entityId);
        if (!key) { unresolvedCount++; continue; }
        showNormalizedName = key.showNormalizedName;
        productionTheatre = key.theatre;
      }

      rows.push({
        entityType: entry.entityType,
        showNormalizedName,
        productionTheatre,
        field: entry.field,
        currentValue: entry.currentValue,
        source: entry.source,
        status: entry.status,
        reviewedValue: entry.reviewedValue,
        note: entry.note,
        createdAt: entry.createdAt,
        reviewedAt: entry.reviewedAt,
      });
    }

    return { total: all.length, offset, count: rows.length, unresolvedCount, rows };
  },
});

// ─── Import mutations (run in prod) ──────────────────────────────────────────

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

const dataStatusValidator = v.optional(
  v.union(
    v.literal("needs_review"),
    v.literal("partial"),
    v.literal("complete")
  )
);

const hotlinkImageSourceValidator = v.optional(
  v.union(v.literal("wikipedia"), v.literal("ticketmaster"))
);

export const importShows = internalMutation({
  args: {
    rows: v.array(
      v.object({
        _devId: v.optional(v.string()),
        name: v.string(),
        normalizedName: v.string(),
        type: showTypeValidator,
        subtype: v.optional(v.string()),
        images: v.optional(v.array(v.any())),
        hotlinkImageUrl: v.optional(v.string()),
        hotlinkImageSource: hotlinkImageSourceValidator,
        wikipediaTitle: v.optional(v.string()),
        ticketmasterAttractionId: v.optional(v.string()),
        isUserCreated: v.boolean(),
        externalSource: v.optional(v.string()),
        externalId: v.optional(v.string()),
        sourceConfidence: v.optional(v.number()),
        dataStatus: dataStatusValidator,
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const row of args.rows) {
      const existing = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", row.normalizedName)
        )
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("shows", {
        name: row.name,
        normalizedName: row.normalizedName,
        type: row.type,
        subtype: row.subtype,
        images: [],
        hotlinkImageUrl: row.hotlinkImageUrl,
        hotlinkImageSource: row.hotlinkImageSource,
        wikipediaTitle: row.wikipediaTitle,
        ticketmasterAttractionId: row.ticketmasterAttractionId,
        isUserCreated: row.isUserCreated,
        externalSource: row.externalSource,
        externalId: row.externalId,
        sourceConfidence: row.sourceConfidence,
        dataStatus: row.dataStatus,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

const productionTypeValidator = v.union(
  v.literal("original"),
  v.literal("revival"),
  v.literal("transfer"),
  v.literal("touring"),
  v.literal("concert"),
  v.literal("workshop"),
  v.literal("other")
);

export const importProductions = internalMutation({
  args: {
    rows: v.array(
      v.object({
        _devId: v.optional(v.string()),
        showNormalizedName: v.string(),
        theatre: v.optional(v.string()),
        city: v.optional(v.string()),
        district: districtValidator,
        previewDate: v.optional(v.string()),
        openingDate: v.optional(v.string()),
        closingDate: v.optional(v.string()),
        isOpenRun: v.optional(v.boolean()),
        productionType: productionTypeValidator,
        hotlinkPosterUrl: v.optional(v.string()),
        ticketmasterEventId: v.optional(v.string()),
        ticketmasterEventUrl: v.optional(v.string()),
        isUserCreated: v.boolean(),
        externalId: v.optional(v.string()),
        notes: v.optional(v.string()),
        dataStatus: dataStatusValidator,
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    const missingShows: string[] = [];

    const showCache = new Map<string, Id<"shows">>();

    for (const row of args.rows) {
      let showId = showCache.get(row.showNormalizedName);
      if (!showId) {
        const show = await ctx.db
          .query("shows")
          .withIndex("by_normalized_name", (q) =>
            q.eq("normalizedName", row.showNormalizedName)
          )
          .first();
        if (!show) {
          missingShows.push(row.showNormalizedName);
          continue;
        }
        showId = show._id;
        showCache.set(row.showNormalizedName, showId);
      }

      if (row.theatre) {
        const existing = await ctx.db
          .query("productions")
          .withIndex("by_show", (q) => q.eq("showId", showId!))
          .filter((q) => q.eq(q.field("theatre"), row.theatre))
          .first();
        if (existing) {
          skipped++;
          continue;
        }
      }

      await ctx.db.insert("productions", {
        showId,
        theatre: row.theatre,
        city: row.city,
        district: row.district,
        previewDate: row.previewDate,
        openingDate: row.openingDate,
        closingDate: row.closingDate,
        isOpenRun: row.isOpenRun,
        productionType: row.productionType,
        hotlinkPosterUrl: row.hotlinkPosterUrl,
        ticketmasterEventId: row.ticketmasterEventId,
        ticketmasterEventUrl: row.ticketmasterEventUrl,
        isUserCreated: row.isUserCreated,
        externalId: row.externalId,
        notes: row.notes,
        dataStatus: row.dataStatus,
      });
      inserted++;
    }

    return {
      inserted,
      skipped,
      missingShows: [...new Set(missingShows)],
    };
  },
});

const venueDistrictValidator = v.union(
  v.literal("broadway"),
  v.literal("off_broadway"),
  v.literal("off_off_broadway"),
  v.literal("west_end"),
  v.literal("touring"),
  v.literal("regional"),
  v.literal("other")
);

const ingestionConfidenceValidator = v.optional(
  v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
);

export const importVenues = internalMutation({
  args: {
    rows: v.array(
      v.object({
        _devId: v.optional(v.string()),
        name: v.string(),
        normalizedName: v.string(),
        aliases: v.optional(v.array(v.string())),
        addressLine1: v.optional(v.string()),
        city: v.string(),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.string(),
        district: venueDistrictValidator,
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        googlePlaceId: v.optional(v.string()),
        source: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
        ingestionConfidence: ingestionConfidenceValidator,
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const row of args.rows) {
      const existing = await ctx.db
        .query("venues")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", row.normalizedName)
        )
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("venues", {
        name: row.name,
        normalizedName: row.normalizedName,
        aliases: row.aliases,
        addressLine1: row.addressLine1,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        country: row.country,
        district: row.district,
        latitude: row.latitude,
        longitude: row.longitude,
        googlePlaceId: row.googlePlaceId,
        source: row.source,
        sourceUrl: row.sourceUrl,
        ingestionConfidence: row.ingestionConfidence,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

const reviewQueueSourceValidator = v.union(
  v.literal("wikipedia"),
  v.literal("ticketmaster"),
  v.literal("bot"),
  v.literal("seed"),
  v.literal("manual"),
  v.literal("wikidata")
);

const reviewQueueStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("edited")
);

const reviewQueueRowValidator = v.object({
  entityType: v.union(v.literal("show"), v.literal("production")),
  showNormalizedName: v.string(),
  productionTheatre: v.optional(v.string()),
  field: v.string(),
  currentValue: v.optional(v.string()),
  source: reviewQueueSourceValidator,
  status: reviewQueueStatusValidator,
  reviewedValue: v.optional(v.string()),
  note: v.optional(v.string()),
  createdAt: v.number(),
  reviewedAt: v.optional(v.number()),
});

export const _importReviewQueueChunk = internalMutation({
  args: { rows: v.array(reviewQueueRowValidator) },
  handler: async (ctx, args) => {
    let inserted = 0;
    const unmapped: string[] = [];

    const showCache = new Map<string, Id<"shows">>();
    const prodCache = new Map<string, Id<"productions">>();

    for (const row of args.rows) {
      let entityId: string;

      if (row.entityType === "show") {
        let showId = showCache.get(row.showNormalizedName);
        if (!showId) {
          const show = await ctx.db
            .query("shows")
            .withIndex("by_normalized_name", (q) =>
              q.eq("normalizedName", row.showNormalizedName)
            )
            .first();
          if (!show) {
            unmapped.push(`show:${row.showNormalizedName}`);
            continue;
          }
          showId = show._id;
          showCache.set(row.showNormalizedName, showId);
        }
        entityId = showId;
      } else {
        let showId = showCache.get(row.showNormalizedName);
        if (!showId) {
          const show = await ctx.db
            .query("shows")
            .withIndex("by_normalized_name", (q) =>
              q.eq("normalizedName", row.showNormalizedName)
            )
            .first();
          if (!show) {
            unmapped.push(`production-show:${row.showNormalizedName}`);
            continue;
          }
          showId = show._id;
          showCache.set(row.showNormalizedName, showId);
        }

        const cacheKey = `${row.showNormalizedName}::${row.productionTheatre ?? ""}`;
        let prodId = prodCache.get(cacheKey);
        if (!prodId) {
          const prods = await ctx.db
            .query("productions")
            .withIndex("by_show", (q) => q.eq("showId", showId!))
            .collect();

          const match = row.productionTheatre
            ? prods.find((p) => p.theatre === row.productionTheatre)
            : prods[0];

          if (!match) {
            unmapped.push(
              `production:${row.showNormalizedName}::${row.productionTheatre ?? "(no theatre)"}`
            );
            continue;
          }
          prodId = match._id;
          prodCache.set(cacheKey, prodId);
        }
        entityId = prodId;
      }

      await ctx.db.insert("reviewQueue", {
        entityType: row.entityType,
        entityId,
        field: row.field,
        currentValue: row.currentValue,
        source: row.source,
        status: row.status,
        reviewedValue: row.reviewedValue,
        note: row.note,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
      });
      inserted++;
    }

    return { inserted, unmapped: [...new Set(unmapped)] };
  },
});

export const importReviewQueue = internalAction({
  args: { rows: v.array(reviewQueueRowValidator) },
  handler: async (ctx, args) => {
    const CHUNK = 300;
    const total = args.rows.length;
    let totalInserted = 0;
    const allUnmapped: string[] = [];

    for (let i = 0; i < total; i += CHUNK) {
      const chunk = args.rows.slice(i, i + CHUNK);
      const result = await ctx.runMutation(
        internal.admin.migration._importReviewQueueChunk,
        { rows: chunk }
      );
      totalInserted += result.inserted;
      allUnmapped.push(...result.unmapped);
    }

    return {
      totalRows: total,
      inserted: totalInserted,
      unmapped: [...new Set(allUnmapped)],
    };
  },
});

// ─── Image migration (storage files from dev → prod) ───────────────────────

export const exportShowImages = internalAction({
  args: {},
  handler: async (ctx) => {
    const shows: Array<{
      normalizedName: string;
      imageUrls: string[];
    }> = [];

    const allShows = await ctx.runQuery(
      internal.admin.migration._showsWithImages
    );

    for (const show of allShows) {
      const urls: string[] = [];
      for (const storageId of show.imageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) urls.push(url);
      }
      if (urls.length > 0) {
        shows.push({ normalizedName: show.normalizedName, imageUrls: urls });
      }
    }

    return { total: shows.length, shows };
  },
});

export const _showsWithImages = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("shows").collect();
    return all
      .filter((s) => s.images.length > 0)
      .map((s) => ({
        normalizedName: s.normalizedName,
        imageIds: s.images as string[],
      }));
  },
});

export const _importShowImageChunk = internalMutation({
  args: {
    rows: v.array(
      v.object({
        normalizedName: v.string(),
        storageId: v.id("_storage"),
      })
    ),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    let missing = 0;

    for (const row of args.rows) {
      const show = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", row.normalizedName)
        )
        .first();
      if (!show) {
        missing++;
        continue;
      }

      const alreadyHas = show.images.some((id) => id === row.storageId);
      if (alreadyHas) continue;

      await ctx.db.patch(show._id, {
        images: [...show.images, row.storageId],
      });
      updated++;
    }

    return { updated, missing };
  },
});

export const importShowImages = internalAction({
  args: {
    rows: v.array(
      v.object({
        normalizedName: v.string(),
        imageUrls: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let uploaded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of args.rows) {
      for (const url of row.imageUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            errors.push(`${row.normalizedName}: HTTP ${response.status}`);
            failed++;
            continue;
          }
          const blob = await response.blob();
          const storageId = await ctx.storage.store(blob);

          await ctx.runMutation(
            internal.admin.migration._importShowImageChunk,
            {
              rows: [{ normalizedName: row.normalizedName, storageId }],
            }
          );
          uploaded++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${row.normalizedName}: ${msg}`);
          failed++;
        }
      }
    }

    return { uploaded, failed, errors: errors.slice(0, 50) };
  },
});

// ─── Production poster image migration ─────────────────────────────────────

export const exportProductionImages = internalAction({
  args: {},
  handler: async (ctx) => {
    const prods = await ctx.runQuery(
      internal.admin.migration._productionsWithPoster
    );

    const results: Array<{
      showNormalizedName: string;
      theatre: string | undefined;
      posterUrl: string;
    }> = [];

    for (const p of prods) {
      const url = await ctx.storage.getUrl(p.posterImageId);
      if (url) {
        results.push({
          showNormalizedName: p.showNormalizedName,
          theatre: p.theatre,
          posterUrl: url,
        });
      }
    }

    return { total: results.length, productions: results };
  },
});

export const _productionsWithPoster = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("productions").collect();
    const results = [];

    for (const p of all) {
      if (!p.posterImage) continue;
      const show = await ctx.db.get(p.showId);
      if (!show) continue;
      results.push({
        showNormalizedName: show.normalizedName,
        theatre: p.theatre,
        posterImageId: p.posterImage as string,
      });
    }

    return results;
  },
});

export const _importProductionImageChunk = internalMutation({
  args: {
    rows: v.array(
      v.object({
        showNormalizedName: v.string(),
        theatre: v.optional(v.string()),
        storageId: v.id("_storage"),
      })
    ),
  },
  handler: async (ctx, args) => {
    let updated = 0;
    let missing = 0;

    for (const row of args.rows) {
      const show = await ctx.db
        .query("shows")
        .withIndex("by_normalized_name", (q) =>
          q.eq("normalizedName", row.showNormalizedName)
        )
        .first();
      if (!show) {
        missing++;
        continue;
      }

      const prods = await ctx.db
        .query("productions")
        .withIndex("by_show", (q) => q.eq("showId", show._id))
        .collect();

      const match = row.theatre
        ? prods.find((p) => p.theatre === row.theatre)
        : prods[0];

      if (!match) {
        missing++;
        continue;
      }

      if (match.posterImage) continue;

      await ctx.db.patch(match._id, { posterImage: row.storageId });
      updated++;
    }

    return { updated, missing };
  },
});

export const importProductionImages = internalAction({
  args: {
    rows: v.array(
      v.object({
        showNormalizedName: v.string(),
        theatre: v.optional(v.string()),
        posterUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let uploaded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of args.rows) {
      try {
        const response = await fetch(row.posterUrl);
        if (!response.ok) {
          errors.push(`${row.showNormalizedName}: HTTP ${response.status}`);
          failed++;
          continue;
        }
        const blob = await response.blob();
        const storageId = await ctx.storage.store(blob);

        await ctx.runMutation(
          internal.admin.migration._importProductionImageChunk,
          {
            rows: [
              {
                showNormalizedName: row.showNormalizedName,
                theatre: row.theatre,
                storageId,
              },
            ],
          }
        );
        uploaded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${row.showNormalizedName}: ${msg}`);
        failed++;
      }
    }

    return { uploaded, failed, errors: errors.slice(0, 50) };
  },
});

// ─── isClosed backfill ────────────────────────────────────────────────────────

/**
 * Backfill: set `isClosed=true` on every production that has no future proof of
 * being currently active.
 *
 * A production is left unchanged (not marked closed) if ANY of the following is true:
 *   • `isOpenRun === true` — explicitly an open-ended run
 *   • `closingDate >= today` — has a known future closing date (date logic handles it)
 *   • `previewDate > today` OR `openingDate > today` — announced/upcoming show
 *   • `isClosed` is already set (true or false) — already reviewed
 *
 * Everything else — productions whose only evidence of "running" is a past
 * opening or preview date — is marked `isClosed=true`.
 *
 * Run with: npx convex run admin/migration:backfillIsClosed
 * For a dry run first: npx convex run admin/migration:backfillIsClosed '{"dryRun":true}'
 */
export const backfillIsClosed = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const today = new Date().toISOString().split("T")[0];

    const productions = await ctx.db.query("productions").collect();

    let marked = 0;
    let skipped = 0;
    let alreadySet = 0;

    for (const p of productions) {
      // Already explicitly reviewed — leave it alone.
      if (p.isClosed !== undefined && p.isClosed !== null) {
        alreadySet++;
        continue;
      }

      // Open run — still active with no planned closing date.
      if (p.isOpenRun === true) {
        skipped++;
        continue;
      }

      // Has a future closing date — date logic already marks it as active.
      if (p.closingDate && p.closingDate >= today) {
        skipped++;
        continue;
      }

      // Announced / upcoming — has at least one future milestone.
      if (
        (p.previewDate && p.previewDate > today) ||
        (p.openingDate && p.openingDate > today)
      ) {
        skipped++;
        continue;
      }

      // Everything else: past dates only, no closing date, not an open run.
      // Mark as closed so it stops appearing as "currently running".
      if (!dryRun) {
        await ctx.db.patch(p._id, { isClosed: true });
      }
      marked++;
    }

    return {
      dryRun,
      total: productions.length,
      marked,
      skipped,
      alreadySet,
    };
  },
});
