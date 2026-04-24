import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Set a hotlink image URL on a show record.
 * Enforces the enrichment upgrade rule: Ticketmaster may overwrite Wikipedia,
 * but Wikipedia must not overwrite an existing Ticketmaster URL.
 *
 * Respects admin rejections: if an admin has previously rejected a
 * `hotlinkImageUrl` proposal from the same source (e.g. Ticketmaster), we
 * will NOT keep re-proposing on subsequent enrichment runs.
 */
export const setShowHotlinkImage = internalMutation({
  args: {
    showId: v.id("shows"),
    hotlinkImageUrl: v.string(),
    hotlinkImageSource: v.union(
      v.literal("wikipedia"),
      v.literal("ticketmaster")
    ),
    wikipediaTitle: v.optional(v.string()),
    ticketmasterAttractionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return;

    const existingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", "show")
          .eq("entityId", args.showId)
          .eq("field", "hotlinkImageUrl")
      )
      .collect();

    // If admin has rejected an image from this source before, stop re-proposing.
    // Ticketmaster images are low quality; admins should be able to reject
    // once and have it stick rather than rejecting daily.
    const sourcePreviouslyRejected = existingEntries.some(
      (e) => e.status === "rejected" && e.source === args.hotlinkImageSource
    );
    if (sourcePreviouslyRejected) {
      // Still keep helpful lookup metadata so we don't retry enrichment APIs.
      const metaPatch: Record<string, unknown> = {};
      if (args.wikipediaTitle && !show.wikipediaTitle)
        metaPatch.wikipediaTitle = args.wikipediaTitle;
      if (args.ticketmasterAttractionId && !show.ticketmasterAttractionId)
        metaPatch.ticketmasterAttractionId = args.ticketmasterAttractionId;
      if (Object.keys(metaPatch).length > 0)
        await ctx.db.patch(args.showId, metaPatch);
      return;
    }

    // Don't overwrite an existing image from a different source.
    // Wikipedia is preferred at the show level (portrait poster art);
    // TM should only fill in when there's nothing at all.
    if (show.hotlinkImageUrl) {
      const metaPatch: Record<string, unknown> = {};
      if (args.wikipediaTitle && !show.wikipediaTitle)
        metaPatch.wikipediaTitle = args.wikipediaTitle;
      if (args.ticketmasterAttractionId && !show.ticketmasterAttractionId)
        metaPatch.ticketmasterAttractionId = args.ticketmasterAttractionId;
      if (Object.keys(metaPatch).length > 0)
        await ctx.db.patch(args.showId, metaPatch);
      return;
    }

    const patch: Record<string, unknown> = {
      hotlinkImageUrl: args.hotlinkImageUrl,
      hotlinkImageSource: args.hotlinkImageSource,
    };
    if (args.wikipediaTitle) patch.wikipediaTitle = args.wikipediaTitle;
    if (args.ticketmasterAttractionId) {
      patch.ticketmasterAttractionId = args.ticketmasterAttractionId;
    }

    await ctx.db.patch(args.showId, patch);

    if (!existingEntries.some((e) => e.status === "pending")) {
      await ctx.db.insert("reviewQueue", {
        entityType: "show",
        entityId: args.showId,
        field: "hotlinkImageUrl",
        currentValue: args.hotlinkImageUrl,
        source: args.hotlinkImageSource,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Mark a show as checked by Wikipedia when no image was found.
 * Prevents re-processing on subsequent backfill runs.
 */
export const markWikipediaChecked = internalMutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show || show.wikipediaTitle) return;
    await ctx.db.patch(args.showId, { wikipediaTitle: "_not_found" });
  },
});

/**
 * Write a Wikipedia-sourced description onto a show and stage a pending
 * reviewQueue entry for admin oversight. Mirrors `setShowHotlinkImage`:
 * the value goes into the live doc immediately (so users see it), and the
 * queue entry gives admins a chance to edit or reject without blocking.
 *
 * Skips the patch if `shows.description` already has a non-Wikipedia source,
 * so Playbill (preferred) and admin edits take precedence.
 */
export const setShowWikipediaDescription = internalMutation({
  args: {
    showId: v.id("shows"),
    description: v.string(),
    wikipediaTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return;

    const currentSource = show.descriptionSource;
    // Don't overwrite Playbill or admin descriptions with Wikipedia text.
    if (
      show.description &&
      currentSource &&
      currentSource !== "wikipedia"
    ) {
      if (args.wikipediaTitle && !show.wikipediaTitle) {
        await ctx.db.patch(args.showId, {
          wikipediaTitle: args.wikipediaTitle,
          descriptionCheckedAt: Date.now(),
        });
      } else {
        await ctx.db.patch(args.showId, {
          descriptionCheckedAt: Date.now(),
        });
      }
      return;
    }

    const patch: Record<string, unknown> = {
      description: args.description,
      descriptionSource: "wikipedia",
      descriptionUpdatedAt: Date.now(),
      descriptionCheckedAt: Date.now(),
    };
    if (args.wikipediaTitle && !show.wikipediaTitle) {
      patch.wikipediaTitle = args.wikipediaTitle;
    }
    await ctx.db.patch(args.showId, patch);

    const existingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", "show")
          .eq("entityId", args.showId)
          .eq("field", "description")
      )
      .collect();

    // Rule: skip if something pending exists (Playbill or earlier Wikipedia
    // run) and skip if an admin already approved this exact text.
    if (existingEntries.some((e) => e.status === "pending")) return;
    const alreadyApproved = existingEntries.some((e) => {
      if (e.status !== "approved" && e.status !== "edited") return false;
      const accepted = e.reviewedValue ?? e.currentValue;
      return accepted === args.description;
    });
    if (alreadyApproved) return;

    await ctx.db.insert("reviewQueue", {
      entityType: "show",
      entityId: args.showId,
      field: "description",
      currentValue: args.description,
      source: "wikipedia",
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Timestamp-only update for shows where Wikipedia returned nothing, so the
 * backfill doesn't re-query them every run.
 */
export const markDescriptionChecked = internalMutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return;
    await ctx.db.patch(args.showId, { descriptionCheckedAt: Date.now() });
  },
});

/**
 * Set a hotlink poster URL on a production record from Ticketmaster.
 *
 * Respects admin rejections: if an admin has previously rejected a
 * Ticketmaster `hotlinkPosterUrl` proposal for this production, we will NOT
 * re-propose on subsequent cron runs (TM images are often the wrong aspect
 * ratio, so admins should reject once and have it stick).
 */
export const setProductionHotlinkImage = internalMutation({
  args: {
    productionId: v.id("productions"),
    hotlinkPosterUrl: v.string(),
    ticketmasterEventId: v.string(),
    ticketmasterEventUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const production = await ctx.db.get(args.productionId);
    if (!production) return;

    const existingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", "production")
          .eq("entityId", args.productionId)
          .eq("field", "hotlinkPosterUrl")
      )
      .collect();

    // Skip entirely if the same source has been rejected before. This stops
    // the "reject, comes back, reject, comes back" loop admins were hitting.
    const tmPreviouslyRejected = existingEntries.some(
      (e) => e.status === "rejected" && e.source === "ticketmaster"
    );
    if (tmPreviouslyRejected) return;

    // Skip if there's already a pending proposal waiting for review.
    if (existingEntries.some((e) => e.status === "pending")) return;

    await ctx.db.patch(args.productionId, {
      hotlinkPosterUrl: args.hotlinkPosterUrl,
      ticketmasterEventId: args.ticketmasterEventId,
      ticketmasterEventUrl: args.ticketmasterEventUrl,
    });

    await ctx.db.insert("reviewQueue", {
      entityType: "production",
      entityId: args.productionId,
      field: "hotlinkPosterUrl",
      currentValue: args.hotlinkPosterUrl,
      source: "ticketmaster",
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
