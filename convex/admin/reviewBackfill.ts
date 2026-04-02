import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  SHOW_REVIEWABLE_FIELDS,
  PRODUCTION_REVIEWABLE_FIELDS,
} from "../reviewQueue";

type Source = "wikipedia" | "ticketmaster" | "bot" | "seed" | "manual" | "wikidata";

function resolveSource(doc: { externalSource?: string }): Source {
  switch (doc.externalSource) {
    case "bot":
      return "bot";
    case "seed":
      return "seed";
    case "wikidata":
      return "wikidata";
    default:
      return "manual";
  }
}

/**
 * Seed the review queue for all shows that haven't been reviewed yet.
 * Self-scheduling: processes BATCH_SIZE shows per invocation, then
 * schedules another run with a cursor if more remain.
 */
export const seedReviewQueueForShows = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 50;
    const allShows = await ctx.db.query("shows").collect();

    // Find our start position based on cursor (show _id)
    let startIdx = 0;
    if (args.cursor) {
      const idx = allShows.findIndex((s) => s._id === args.cursor);
      startIdx = idx >= 0 ? idx : allShows.length;
    }

    const batch = allShows.slice(startIdx, startIdx + BATCH_SIZE);
    let processed = 0;

    for (const show of batch) {
      const status = show.dataStatus ?? undefined;
      if (status === undefined) {
        await ctx.db.patch(show._id, { dataStatus: "needs_review" });
      }

      const source = resolveSource(show);
      const now = Date.now();

      for (const field of SHOW_REVIEWABLE_FIELDS) {
        const value = show[field as keyof typeof show];
        if (value === undefined || value === null) continue;

        const existing = await ctx.db
          .query("reviewQueue")
          .withIndex("by_entity_field", (q) =>
            q
              .eq("entityType", "show")
              .eq("entityId", show._id)
              .eq("field", field)
          )
          .first();

        if (existing) continue;

        let entrySource = source;
        if (field === "hotlinkImageUrl" && show.hotlinkImageSource) {
          entrySource = show.hotlinkImageSource;
        }

        await ctx.db.insert("reviewQueue", {
          entityType: "show",
          entityId: show._id,
          field,
          currentValue: String(value),
          source: entrySource,
          status: "pending",
          createdAt: now,
        });
      }

      processed++;
    }

    const nextIdx = startIdx + BATCH_SIZE;
    if (nextIdx < allShows.length) {
      await ctx.scheduler.runAfter(
        0,
        internal.admin.reviewBackfill.seedReviewQueueForShows,
        { cursor: allShows[nextIdx]._id }
      );
    }

    return { processed, hasMore: nextIdx < allShows.length };
  },
});

/**
 * Seed the review queue for all productions that haven't been reviewed yet.
 * Same self-scheduling pattern as the show backfill.
 */
export const seedReviewQueueForProductions = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 50;
    const allProductions = await ctx.db.query("productions").collect();

    let startIdx = 0;
    if (args.cursor) {
      const idx = allProductions.findIndex((p) => p._id === args.cursor);
      startIdx = idx >= 0 ? idx : allProductions.length;
    }

    const batch = allProductions.slice(startIdx, startIdx + BATCH_SIZE);
    let processed = 0;

    for (const prod of batch) {
      const status = prod.dataStatus ?? undefined;
      if (status === undefined) {
        await ctx.db.patch(prod._id, { dataStatus: "needs_review" });
      }

      // Derive source from the parent show
      const show = await ctx.db.get(prod.showId);
      const source = show ? resolveSource(show) : "manual";
      const now = Date.now();

      for (const field of PRODUCTION_REVIEWABLE_FIELDS) {
        const value = prod[field as keyof typeof prod];
        if (value === undefined || value === null) continue;

        const existing = await ctx.db
          .query("reviewQueue")
          .withIndex("by_entity_field", (q) =>
            q
              .eq("entityType", "production")
              .eq("entityId", prod._id)
              .eq("field", field)
          )
          .first();

        if (existing) continue;

        let entrySource = source;
        if (field === "hotlinkPosterUrl") {
          entrySource = "ticketmaster";
        }

        await ctx.db.insert("reviewQueue", {
          entityType: "production",
          entityId: prod._id,
          field,
          currentValue: String(value),
          source: entrySource,
          status: "pending",
          createdAt: now,
        });
      }

      processed++;
    }

    const nextIdx = startIdx + BATCH_SIZE;
    if (nextIdx < allProductions.length) {
      await ctx.scheduler.runAfter(
        0,
        internal.admin.reviewBackfill.seedReviewQueueForProductions,
        { cursor: allProductions[nextIdx]._id }
      );
    }

    return { processed, hasMore: nextIdx < allProductions.length };
  },
});

// ─── Public triggers (callable from CLI / dashboard) ─────────────────────────

export const runSeedShows = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.admin.reviewBackfill.seedReviewQueueForShows,
      {}
    );
    return "Queued seedReviewQueueForShows";
  },
});

export const runSeedProductions = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.admin.reviewBackfill.seedReviewQueueForProductions,
      {}
    );
    return "Queued seedReviewQueueForProductions";
  },
});
