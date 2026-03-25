import { cronJobs } from "convex/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const crons = cronJobs();

// ─── Queries used by cron actions ────────────────────────────────────────────

export const getProductionsClosingSoon = internalQuery({
  args: { withinDays: v.number() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + args.withinDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const productions = await ctx.db.query("productions").collect();
    return productions.filter(
      (p) =>
        p.closingDate !== undefined &&
        p.closingDate >= today &&
        p.closingDate <= cutoffStr
    );
  },
});

export const getUserListsContainingShow = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const allLists = await ctx.db.query("userLists").collect();
    return allLists.filter((list) => list.showIds.includes(args.showId));
  },
});

export const hasRecentClosingSoonNotification = internalQuery({
  args: {
    recipientUserId: v.id("users"),
    productionId: v.id("productions"),
    withinMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.withinMs;
    const recent = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_createdAt", (q) =>
        q.eq("recipientUserId", args.recipientUserId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "closing_soon"),
          q.eq(q.field("productionId"), args.productionId),
          q.gte(q.field("createdAt"), cutoff)
        )
      )
      .first();
    return recent !== null;
  },
});

// ─── Mutations used by cron actions ──────────────────────────────────────────

export const insertClosingSoonNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    showId: v.id("shows"),
    productionId: v.id("productions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      recipientUserId: args.recipientUserId,
      actorKind: "system",
      type: "closing_soon",
      showId: args.showId,
      productionId: args.productionId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// ─── Daily closing-soon alert ─────────────────────────────────────────────────

export const sendClosingSoonAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const CLOSE_WINDOW_DAYS = 14;
    const DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    const productions = await ctx.runQuery(
      internal.crons.getProductionsClosingSoon,
      { withinDays: CLOSE_WINDOW_DAYS }
    );

    for (const production of productions) {
      // Find all users who have this show in any list.
      const lists = await ctx.runQuery(internal.crons.getUserListsContainingShow, {
        showId: production.showId,
      });

      const userIds = [...new Set(lists.map((l: { userId: Id<"users"> }) => l.userId))];

      for (const userId of userIds) {
        // Skip if we already sent a closing_soon notification in the last 7 days.
        const alreadySent = await ctx.runQuery(
          internal.crons.hasRecentClosingSoonNotification,
          {
            recipientUserId: userId,
            productionId: production._id,
            withinMs: DEDUP_WINDOW_MS,
          }
        );
        if (alreadySent) continue;

        await ctx.runMutation(internal.crons.insertClosingSoonNotification, {
          recipientUserId: userId,
          showId: production.showId,
          productionId: production._id,
        });

        const daysLeft = Math.ceil(
          (new Date(production.closingDate!).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        );

        await ctx.runAction(internal.notifications.sendPushNotification, {
          recipientUserId: userId,
          title: "Closing soon",
          body: `A show on your list closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
          data: {
            type: "closing_soon",
            showId: production.showId,
            productionId: production._id,
          },
        });
      }

    }
  },
});

// ─── Schedule ─────────────────────────────────────────────────────────────────

// Run daily at 9:00 AM ET (14:00 UTC).
crons.daily(
  "closing-soon-alerts",
  { hourUTC: 14, minuteUTC: 0 },
  internal.crons.sendClosingSoonAlerts,
  {}
);

export default crons;
