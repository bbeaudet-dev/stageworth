import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveShowImageUrls, resolveProductionPosterUrl } from "./helpers";

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

// ─── Queries ──────────────────────────────────────────────────────────────────

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireConvexUserId(ctx);
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

export const listShowsForReview = query({
  args: {
    statusFilter: v.optional(dataStatusValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);

    let shows = await ctx.db.query("shows").collect();

    // Filter by dataStatus
    if (args.statusFilter) {
      shows = shows.filter((s) => {
        const status = s.dataStatus ?? "needs_review";
        return status === args.statusFilter;
      });
    }

    // Filter by name search
    if (args.search) {
      const needle = args.search.trim().toLowerCase();
      if (needle.length > 0) {
        shows = shows.filter((s) => s.name.toLowerCase().includes(needle));
      }
    }

    // Sort: needs_review first, then partial, then complete
    const statusOrder = { needs_review: 0, partial: 1, complete: 2 };
    shows.sort((a, b) => {
      const aOrder = statusOrder[a.dataStatus ?? "needs_review"];
      const bOrder = statusOrder[b.dataStatus ?? "needs_review"];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    // Get pending review counts per show
    const pendingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const pendingCountByEntity = new Map<string, number>();
    for (const entry of pendingEntries) {
      const key = `${entry.entityType}:${entry.entityId}`;
      pendingCountByEntity.set(key, (pendingCountByEntity.get(key) || 0) + 1);
    }

    return Promise.all(
      shows.map(async (show) => {
        const images = await resolveShowImageUrls(ctx, show);
        const showPending = pendingCountByEntity.get(`show:${show._id}`) ?? 0;

        // Also count pending production entries for this show
        const productions = await ctx.db
          .query("productions")
          .withIndex("by_show", (q) => q.eq("showId", show._id))
          .collect();
        let productionPending = 0;
        for (const p of productions) {
          productionPending +=
            pendingCountByEntity.get(`production:${p._id}`) ?? 0;
        }

        return {
          _id: show._id,
          name: show.name,
          type: show.type,
          dataStatus: show.dataStatus ?? "needs_review",
          imageUrl: images[0] ?? null,
          pendingCount: showPending + productionPending,
          productionCount: productions.length,
        };
      })
    );
  },
});

export const getShowReviewDetail = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);

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

        return {
          ...p,
          posterUrl,
          dataStatus: p.dataStatus ?? "needs_review",
          reviewEntries: entries,
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
    await requireConvexUserId(ctx);

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
  },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);
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

async function applyFieldChange(
  ctx: any,
  entityType: string,
  entityId: string,
  field: string,
  value: string | undefined
) {
  const tableName = entityType === "show" ? "shows" : "productions";
  const doc = await ctx.db.get(entityId as any);
  if (!doc) return;

  if (value === undefined) {
    // Reject: clear the field
    if (field === "hotlinkImageUrl") {
      await ctx.db.patch(entityId as any, {
        hotlinkImageUrl: undefined,
        hotlinkImageSource: undefined,
      });
    } else if (field === "hotlinkPosterUrl") {
      await ctx.db.patch(entityId as any, { hotlinkPosterUrl: undefined });
    } else {
      await ctx.db.patch(entityId as any, { [field]: undefined });
    }
  } else {
    await ctx.db.patch(entityId as any, { [field]: value });
  }
}
