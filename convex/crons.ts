import { cronJobs } from "convex/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { isCatalogPublished } from "./catalogVisibility";
import { notifyUser } from "./notificationDispatch";

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
    const eligible = productions.filter(
      (p) =>
        isCatalogPublished(p.dataStatus) &&
        p.closingDate !== undefined &&
        p.closingDate >= today &&
        p.closingDate <= cutoffStr
    );

    return await Promise.all(
      eligible.map(async (p) => {
        const show = await ctx.db.get(p.showId);
        return { production: p, showName: show?.name ?? null };
      })
    );
  },
});

export const getWantToSeeListsContainingShow = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const allLists = await ctx.db.query("userLists").collect();
    return allLists.filter(
      (list) =>
        list.systemKey === "want_to_see" && list.showIds.includes(args.showId)
    );
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

function buildClosingSoonCopy(
  showName: string | null,
  daysLeft: number
): { title: string; body: string } {
  const subject = showName ?? "A show on your Want to See list";
  const safeDays = Math.max(0, daysLeft);

  if (safeDays <= 1) {
    const when = safeDays === 0 ? "closes today" : "closes tomorrow";
    return {
      title: "Last chance",
      body: `${subject} ${when} — last chance to get tickets!`,
    };
  }

  return {
    title: "Closing this week",
    body: `${subject} closes this week — catch it before it's gone!`,
  };
}

export const insertClosingSoonNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    showId: v.id("shows"),
    productionId: v.id("productions"),
    daysLeft: v.number(),
    showName: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { title, body } = buildClosingSoonCopy(args.showName, args.daysLeft);
    await notifyUser(ctx, {
      recipientUserId: args.recipientUserId,
      actorKind: "system",
      type: "closing_soon",
      showId: args.showId,
      productionId: args.productionId,
      push: {
        title,
        body,
        data: {
          type: "closing_soon",
          showId: args.showId,
          productionId: args.productionId,
        },
      },
    });
  },
});

// ─── Daily closing-soon alert ─────────────────────────────────────────────────

export const sendClosingSoonAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const CLOSE_WINDOW_DAYS = 7;
    const DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    const productionsWithShow = await ctx.runQuery(
      internal.crons.getProductionsClosingSoon,
      { withinDays: CLOSE_WINDOW_DAYS }
    );

    for (const { production, showName } of productionsWithShow) {
      // Only notify users who actively want to see this show (Want to See list),
      // not users who have it on other lists (e.g. seen/archived/trip planning).
      const lists = await ctx.runQuery(
        internal.crons.getWantToSeeListsContainingShow,
        { showId: production.showId }
      );

      const userIds = [
        ...new Set(lists.map((l: { userId: Id<"users"> }) => l.userId)),
      ];

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

        const daysLeft = Math.ceil(
          (new Date(production.closingDate!).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        // `insertClosingSoonNotification` uses the shared `notifyUser` helper
        // which gates on preferences and schedules the push in one step.
        await ctx.runMutation(internal.crons.insertClosingSoonNotification, {
          recipientUserId: userId,
          showId: production.showId,
          productionId: production._id,
          daysLeft,
          showName,
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

// After closing date + grace, stage `isClosed` / `isOpenRun` fixes on reviewQueue (15:05 UTC).
crons.daily(
  "post-closing-grace-review-queue",
  { hourUTC: 15, minuteUTC: 5 },
  internal.reviewQueue.stagePostClosingGraceSuggestions,
  {}
);

// Enrich NYC production images from Ticketmaster daily at 6:00 AM ET (11:00 UTC).
crons.daily(
  "enrich-production-images",
  { hourUTC: 11, minuteUTC: 0 },
  internal.imageEnrichment.ticketmaster.enrichProductionImages,
  {}
);

// Recompute global theatre ranks daily at 3:00 AM ET (8:00 UTC).
crons.daily(
  "recompute-theatre-ranks",
  { hourUTC: 8, minuteUTC: 0 },
  internal.userStats.recomputeAllRanks,
  {}
);

export default crons;
