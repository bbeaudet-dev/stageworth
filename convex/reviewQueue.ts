import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { resolveShowImageUrls, resolveProductionPosterUrl } from "./helpers";
import { normalizeShowName } from "./showNormalization";
import { getProductionStatus } from "../src/utils/productions";

// Fields we track in the review queue for each entity type.
export const SHOW_REVIEWABLE_FIELDS = [
  "name",
  "type",
  "subtype",
  "hotlinkImageUrl",
] as const;

export const PRODUCTION_REVIEWABLE_FIELDS = [
  "theatre",
  "city",
  "district",
  "previewDate",
  "openingDate",
  "closingDate",
  "productionType",
  "hotlinkPosterUrl",
] as const;

const dataStatusValidator = v.union(
  v.literal("needs_review"),
  v.literal("partial"),
  v.literal("complete")
);

const reviewDecisionValidator = v.union(
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("edited")
);

const sourceValidator = v.union(
  v.literal("wikipedia"),
  v.literal("ticketmaster"),
  v.literal("bot"),
  v.literal("seed"),
  v.literal("manual"),
  v.literal("wikidata")
);

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("other")
);

// ─── Queries ──────────────────────────────────────────────────────────────────

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allShows = await ctx.db.query("shows").collect();

    let needsReview = 0;
    let partial = 0;
    let complete = 0;
    for (const s of allShows) {
      const status = s.dataStatus ?? "needs_review";
      if (status === "needs_review") needsReview++;
      else if (status === "partial") partial++;
      else complete++;
    }

    const pendingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      shows: { needsReview, partial, complete, total: allShows.length },
      pendingQueueEntries: pendingEntries.length,
    };
  },
});

/**
 * Admin schedule filter only (data status is a separate control).
 * Uses production dates vs `asOf` (UTC calendar day, same as `getProductionStatus` default).
 * - current_upcoming: at least one run is not `closed` (previews, open, announced future, open run, etc.).
 * - historical: all runs closed, no productions, or dates missing so status resolves to `closed`.
 */
function scheduleBucketForShow(
  prods: Array<{
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
  }>,
  asOf: string
): "current_upcoming" | "historical" {
  if (prods.length === 0) return "historical";
  const anyLiveOrUpcoming = prods.some(
    (p) => getProductionStatus(p, asOf) !== "closed"
  );
  return anyLiveOrUpcoming ? "current_upcoming" : "historical";
}

export const listShowsForReview = query({
  args: {
    statusFilter: v.optional(dataStatusValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    /** Admin list loads a large page once; client filters by schedule without extra args. */
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 5000);
    const offset = Math.max(args.offset ?? 0, 0);
    const asOf = new Date().toISOString().split("T")[0];

    const allProductions = await ctx.db.query("productions").collect();
    const productionIdsByShow = new Map<Id<"shows">, Id<"productions">[]>();
    const prodsByShowId = new Map<
      Id<"shows">,
      (typeof allProductions)[number][]
    >();
    for (const p of allProductions) {
      const list = productionIdsByShow.get(p.showId) ?? [];
      list.push(p._id);
      productionIdsByShow.set(p.showId, list);
      const arr = prodsByShowId.get(p.showId) ?? [];
      arr.push(p);
      prodsByShowId.set(p.showId, arr);
    }

    let shows = await ctx.db.query("shows").collect();

    if (args.statusFilter) {
      shows = shows.filter((s) => {
        const status = s.dataStatus ?? "needs_review";
        return status === args.statusFilter;
      });
    }

    if (args.search) {
      const needle = args.search.trim().toLowerCase();
      if (needle.length > 0) {
        shows = shows.filter((s) => s.name.toLowerCase().includes(needle));
      }
    }

    const statusOrder = { needs_review: 0, partial: 1, complete: 2 };
    shows.sort((a, b) => {
      const aOrder = statusOrder[a.dataStatus ?? "needs_review"];
      const bOrder = statusOrder[b.dataStatus ?? "needs_review"];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    const total = shows.length;
    const pageShows = shows.slice(offset, offset + limit);

    const pendingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const pendingCountByEntity = new Map<string, number>();
    for (const entry of pendingEntries) {
      const key = `${entry.entityType}:${entry.entityId}`;
      pendingCountByEntity.set(key, (pendingCountByEntity.get(key) || 0) + 1);
    }

    const page = await Promise.all(
      pageShows.map(async (show) => {
        const images = await resolveShowImageUrls(ctx, show);
        const showPending = pendingCountByEntity.get(`show:${show._id}`) ?? 0;
        const prodIds = productionIdsByShow.get(show._id) ?? [];
        let productionPending = 0;
        for (const pid of prodIds) {
          productionPending +=
            pendingCountByEntity.get(`production:${pid}`) ?? 0;
        }

        const prods = prodsByShowId.get(show._id) ?? [];
        return {
          _id: show._id,
          name: show.name,
          type: show.type,
          dataStatus: show.dataStatus ?? "needs_review",
          imageUrl: images[0] ?? null,
          pendingCount: showPending + productionPending,
          productionCount: prodIds.length,
          scheduleBucket: scheduleBucketForShow(prods, asOf),
        };
      })
    );

    return {
      page,
      total,
      hasMore: offset + page.length < total,
    };
  },
});

export const getShowReviewDetail = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;

    const showImages = await resolveShowImageUrls(ctx, show);

    // Get all review queue entries for this show
    const showEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "show").eq("entityId", show._id)
      )
      .collect();

    // Get all productions for this show
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", show._id))
      .collect();

    const productionsWithDetails = await Promise.all(
      productions.map(async (p) => {
        const posterUrl = await resolveProductionPosterUrl(ctx, p);
        const entries = await ctx.db
          .query("reviewQueue")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "production").eq("entityId", p._id)
          )
          .collect();

        // Try to find a matching venue by normalized theatre name.
        let venueMatch: { _id: string; name: string; city: string } | null =
          null;
        if (p.theatre) {
          const normalizedName = normalizeForVenueMatch(p.theatre);
          const venue = await ctx.db
            .query("venues")
            .withIndex("by_normalized_name", (q) =>
              q.eq("normalizedName", normalizedName)
            )
            .first();
          if (venue) {
            venueMatch = { _id: venue._id, name: venue.name, city: venue.city };
          }
        }

        return {
          ...p,
          posterUrl,
          dataStatus: p.dataStatus ?? "needs_review",
          reviewEntries: entries,
          venueMatch,
        };
      })
    );

    return {
      show: {
        ...show,
        images: showImages,
        dataStatus: show.dataStatus ?? "needs_review",
      },
      showReviewEntries: showEntries,
      productions: productionsWithDetails,
    };
  },
});

export const listPartialShows = query({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const partialShows = shows.filter(
      (s) => s.dataStatus === "partial"
    );

    return Promise.all(
      partialShows
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (show) => {
          const images = await resolveShowImageUrls(ctx, show);
          const productions = await ctx.db
            .query("productions")
            .withIndex("by_show", (q) => q.eq("showId", show._id))
            .collect();

          const missingFields: string[] = [];
          if (!show.hotlinkImageUrl && show.images.length === 0) {
            missingFields.push("Image");
          }
          if (!show.subtype) missingFields.push("Sub-type");

          const hasProductionImages = productions.some(
            (p) => p.hotlinkPosterUrl || p.posterImage
          );
          if (!hasProductionImages && productions.length > 0) {
            missingFields.push("Production poster(s)");
          }
          if (productions.length === 0) {
            missingFields.push("Productions");
          }

          return {
            _id: show._id,
            name: show.name,
            type: show.type,
            imageUrl: images[0] ?? null,
            productionCount: productions.length,
            missingFields,
          };
        })
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** One-shot upload URL for the admin “missing show” form (image → Convex storage). */
export const generateShowImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Create a new unpublished show, optional key art on `images[]`, and pending queue rows for name, type, and image URL when uploaded. */
export const createShowFromAdminForm = mutation({
  args: {
    name: v.string(),
    type: showTypeValidator,
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeShowName(name);
    if (!normalizedName) {
      throw new Error("Show name is required");
    }

    const existingByNormalizedName = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (existingByNormalizedName) {
      throw new Error("A show with this name already exists");
    }

    const images = args.imageStorageId ? [args.imageStorageId] : [];

    const showId = await ctx.db.insert("shows", {
      name,
      normalizedName,
      type: args.type,
      images,
      isUserCreated: false,
      dataStatus: "needs_review",
    });

    const entityId = showId as string;
    const now = Date.now();

    for (const [field, currentValue] of [
      ["name", name],
      ["type", args.type],
    ] as const) {
      await ctx.db.insert("reviewQueue", {
        entityType: "show",
        entityId,
        field,
        currentValue,
        source: "manual",
        status: "pending",
        createdAt: now,
      });
    }

    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
      if (imageUrl) {
        await ctx.db.insert("reviewQueue", {
          entityType: "show",
          entityId,
          field: "hotlinkImageUrl",
          currentValue: imageUrl,
          source: "manual",
          status: "pending",
          createdAt: now,
        });
      }
    }

    return showId;
  },
});

export const submitShowReview = mutation({
  args: {
    showId: v.id("shows"),
    showDataStatus: dataStatusValidator,
    entryDecisions: v.array(
      v.object({
        entryId: v.id("reviewQueue"),
        decision: reviewDecisionValidator,
        reviewedValue: v.optional(v.string()),
        note: v.optional(v.string()),
      })
    ),
    productionStatuses: v.optional(
      v.array(
        v.object({
          productionId: v.id("productions"),
          dataStatus: dataStatusValidator,
        })
      )
    ),
    // Ad-hoc field patches that bypass the review queue (e.g. direct edits /
    // clears on fields that have no pending queue entry).
    directEdits: v.optional(
      v.array(
        v.object({
          entityType: v.union(v.literal("show"), v.literal("production")),
          entityId: v.string(),
          field: v.string(),
          // undefined = clear the field
          newValue: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const decision of args.entryDecisions) {
      const entry = await ctx.db.get(decision.entryId);
      if (!entry) continue;

      await ctx.db.patch(decision.entryId, {
        status: decision.decision,
        reviewedValue: decision.reviewedValue,
        note: decision.note,
        reviewedAt: now,
      });

      if (decision.decision === "rejected") {
        await applyFieldChange(
          ctx,
          entry.entityType,
          entry.entityId,
          entry.field,
          undefined
        );
      } else if (
        decision.decision === "edited" &&
        decision.reviewedValue !== undefined
      ) {
        await applyFieldChange(
          ctx,
          entry.entityType,
          entry.entityId,
          entry.field,
          decision.reviewedValue
        );
      }
    }

    // Apply direct field edits/clears (no queue entry required).
    if (args.directEdits) {
      for (const edit of args.directEdits) {
        await applyFieldChange(
          ctx,
          edit.entityType,
          edit.entityId,
          edit.field,
          edit.newValue
        );
      }
    }

    // Set dataStatus on the show
    await ctx.db.patch(args.showId, { dataStatus: args.showDataStatus });

    // Set dataStatus on productions
    if (args.productionStatuses) {
      for (const ps of args.productionStatuses) {
        await ctx.db.patch(ps.productionId, { dataStatus: ps.dataStatus });
      }
    }
  },
});

/**
 * Internal mutation for bot/enrichment/backfill to create queue entries.
 * Idempotent: skips if a pending entry already exists for the same entity + field.
 */
export const createEntry = internalMutation({
  args: {
    entityType: v.union(v.literal("show"), v.literal("production")),
    entityId: v.string(),
    field: v.string(),
    currentValue: v.optional(v.string()),
    source: sourceValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
          .eq("field", args.field)
      )
      .collect();

    const hasPending = existing.some((e) => e.status === "pending");
    if (hasPending) return null;

    return await ctx.db.insert("reviewQueue", {
      entityType: args.entityType,
      entityId: args.entityId,
      field: args.field,
      currentValue: args.currentValue,
      source: args.source,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Same normalization used by the venues seeder — kept in sync manually. */
function normalizeForVenueMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Fields stored as booleans — string values "true"/"false" must be converted.
const BOOLEAN_FIELDS = new Set(["isOpenRun"]);

async function applyFieldChange(
  ctx: any,
  entityType: string,
  entityId: string,
  field: string,
  value: string | undefined
) {
  const doc = await ctx.db.get(entityId as any);
  if (!doc) return;

  if (value === undefined) {
    // Clear the field (reject or explicit clear).
    // Clearing hotlinkImageUrl should also clear its source.
    if (field === "hotlinkImageUrl") {
      await ctx.db.patch(entityId as any, {
        hotlinkImageUrl: undefined,
        hotlinkImageSource: undefined,
      });
    } else {
      await ctx.db.patch(entityId as any, { [field]: undefined });
    }
  } else if (BOOLEAN_FIELDS.has(field)) {
    const boolValue =
      value === "true" ? true : value === "false" ? false : undefined;
    await ctx.db.patch(entityId as any, { [field]: boolValue });
  } else {
    await ctx.db.patch(entityId as any, { [field]: value });
  }
}
