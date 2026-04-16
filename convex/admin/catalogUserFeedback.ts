import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireConvexUserId } from "../auth";

const MAX_NOTE_LEN = 4000;

/**
 * Logged-in users only. Stores a snapshot of show name and optional production label.
 * showId is optional to support "missing show" reports from search / add-visit screens.
 */
export const submit = mutation({
  args: {
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
    note: v.string(),
    /** Where the report originated: "show_detail" | "search" | "add_visit" */
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const note = args.note.trim();
    if (note.length < 3) {
      throw new Error("Please add a bit more detail.");
    }
    if (note.length > MAX_NOTE_LEN) {
      throw new Error("Note is too long.");
    }

    let showNameSnapshot: string | undefined;
    if (args.showId) {
      const show = await ctx.db.get(args.showId);
      if (!show) {
        throw new Error("Show not found.");
      }
      showNameSnapshot = show.name;
    }

    let productionLabelSnapshot: string | undefined;
    if (args.productionId) {
      if (!args.showId) {
        throw new Error("productionId requires showId.");
      }
      const prod = await ctx.db.get(args.productionId);
      if (!prod || prod.showId !== args.showId) {
        throw new Error("Production does not belong to this show.");
      }
      const parts = [prod.theatre, prod.city].filter(Boolean).join(" · ");
      productionLabelSnapshot = parts || undefined;
    }

    return await ctx.db.insert("catalogUserFeedback", {
      userId,
      showId: args.showId,
      showNameSnapshot,
      productionId: args.productionId,
      productionLabelSnapshot,
      note,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

/**
 * Admin website only (relies on site auth). Lists newest first.
 * Not scoped to an admin Convex identity yet.
 */
export const listForAdmin = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const max = Math.min(Math.max(args.limit ?? 150, 1), 500);
    const rows = await ctx.db.query("catalogUserFeedback").collect();
    rows.sort((a, b) => b.createdAt - a.createdAt);
    const slice = rows.slice(0, max);

    return await Promise.all(
      slice.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          _id: r._id,
          createdAt: r.createdAt,
          note: r.note,
          showId: r.showId,
          showNameSnapshot: r.showNameSnapshot,
          productionId: r.productionId,
          productionLabelSnapshot: r.productionLabelSnapshot,
          source: r.source ?? null,
          userId: r.userId,
          userUsername: user?.username ?? null,
          userEmail: user?.email ?? null,
        };
      })
    );
  },
});
