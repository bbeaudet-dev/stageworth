import { cronJobs } from "convex/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { isCatalogPublished } from "./catalogVisibility";
import { notifyUser } from "./notificationDispatch";

const crons = cronJobs();

function addDaysToDateStr(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

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

export const getAllUserIdsForNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => user._id);
  },
});

export const getProductionsOpeningToday = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const productions = await ctx.db.query("productions").collect();
    const eligible = productions.filter(
      (p) =>
        isCatalogPublished(p.dataStatus) &&
        p.openingDate !== undefined &&
        p.openingDate === args.date,
    );

    return await Promise.all(
      eligible.map(async (p) => {
        const show = await ctx.db.get(p.showId);
        if (!show || !isCatalogPublished(show.dataStatus)) return [];
        return [{ production: p, showName: show.name }];
      }),
    ).then((rows) => rows.flat());
  },
});

export const getProductionsStartingPreviewsToday = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const productions = await ctx.db.query("productions").collect();
    const eligible = productions.filter(
      (p) =>
        isCatalogPublished(p.dataStatus) &&
        p.previewDate !== undefined &&
        p.previewDate === args.date,
    );

    return await Promise.all(
      eligible.map(async (p) => {
        const show = await ctx.db.get(p.showId);
        if (!show || !isCatalogPublished(show.dataStatus)) return [];
        return [{ production: p, showName: show.name }];
      }),
    ).then((rows) => rows.flat());
  },
});

export const getTripsByDate = internalQuery({
  args: {
    date: v.string(),
    field: v.union(v.literal("startDate"), v.literal("endDate")),
  },
  handler: async (ctx, args) => {
    const trips = await ctx.db.query("trips").collect();
    const eligible = trips.filter((trip) => trip[args.field] === args.date);

    return await Promise.all(
      eligible.map(async (trip) => {
        const members = await ctx.db
          .query("tripMembers")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();
        const recipientUserIds = [
          trip.userId,
          ...members
            .filter((member) => member.status === "accepted")
            .map((member) => member.userId),
        ];
        return { trip, recipientUserIds: [...new Set(recipientUserIds)] };
      }),
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

export const hasProductionNotification = internalQuery({
  args: {
    recipientUserId: v.id("users"),
    productionId: v.id("productions"),
    type: v.union(v.literal("show_opened"), v.literal("previews_started")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_createdAt", (q) =>
        q.eq("recipientUserId", args.recipientUserId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), args.type),
          q.eq(q.field("productionId"), args.productionId)
        )
      )
      .first();
    return existing !== null;
  },
});

export const hasTripNotification = internalQuery({
  args: {
    recipientUserId: v.id("users"),
    tripId: v.id("trips"),
    type: v.union(
      v.literal("trip_starting_tomorrow"),
      v.literal("trip_starts_today"),
      v.literal("trip_ends_today"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_createdAt", (q) =>
        q.eq("recipientUserId", args.recipientUserId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), args.type),
          q.eq(q.field("tripId"), args.tripId)
        )
      )
      .first();
    return existing !== null;
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

function buildShowMilestoneCopy(
  type: "show_opened" | "previews_started",
  showName: string | null,
): { title: string; body: string } {
  const subject = showName ?? "A show";
  if (type === "previews_started") {
    return {
      title: "Now in previews",
      body: `${subject} starts previews today.`,
    };
  }
  return {
    title: "Opening night",
    body: `${subject} opens today.`,
  };
}

type TripReminderType =
  | "trip_starting_tomorrow"
  | "trip_starts_today"
  | "trip_ends_today";

function buildTripReminderCopy(
  type: TripReminderType,
  tripName: string,
): { title: string; body: string } {
  if (type === "trip_starting_tomorrow") {
    return {
      title: "Trip starts tomorrow",
      body: `${tripName} starts tomorrow. Time to get excited!`,
    };
  }
  if (type === "trip_ends_today") {
    return {
      title: "Trip ends today",
      body: `${tripName} ends today. How was it?`,
    };
  }
  return {
    title: "Enjoy your trip",
    body: `${tripName} starts today. Have an amazing time!`,
  };
}

export const insertShowMilestoneNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    showId: v.id("shows"),
    productionId: v.id("productions"),
    showName: v.union(v.string(), v.null()),
    type: v.union(v.literal("show_opened"), v.literal("previews_started")),
  },
  handler: async (ctx, args) => {
    const { title, body } = buildShowMilestoneCopy(args.type, args.showName);
    await notifyUser(ctx, {
      recipientUserId: args.recipientUserId,
      actorKind: "system",
      type: args.type,
      showId: args.showId,
      productionId: args.productionId,
      push: {
        title,
        body,
        data: {
          type: args.type,
          showId: args.showId,
          productionId: args.productionId,
        },
      },
    });
  },
});

export const insertTripReminderNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    tripId: v.id("trips"),
    tripName: v.string(),
    type: v.union(
      v.literal("trip_starting_tomorrow"),
      v.literal("trip_starts_today"),
      v.literal("trip_ends_today"),
    ),
  },
  handler: async (ctx, args) => {
    const { title, body } = buildTripReminderCopy(args.type, args.tripName);
    await notifyUser(ctx, {
      recipientUserId: args.recipientUserId,
      actorKind: "system",
      type: args.type,
      tripId: args.tripId,
      push: {
        title,
        body,
        data: {
          type: args.type,
          tripId: args.tripId,
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

export const sendShowMilestoneAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const [openingProductions, previewProductions] = await Promise.all([
      ctx.runQuery(internal.crons.getProductionsOpeningToday, { date: today }),
      ctx.runQuery(internal.crons.getProductionsStartingPreviewsToday, { date: today }),
    ]);

    const allUserIds = (await ctx.runQuery(
      internal.crons.getAllUserIdsForNotifications,
      {},
    )) as Id<"users">[];

    for (const { production, showName } of openingProductions) {
      for (const userId of allUserIds) {
        const alreadySent = await ctx.runQuery(
          internal.crons.hasProductionNotification,
          {
            recipientUserId: userId,
            productionId: production._id,
            type: "show_opened",
          },
        );
        if (alreadySent) continue;

        await ctx.runMutation(internal.crons.insertShowMilestoneNotification, {
          recipientUserId: userId,
          showId: production.showId,
          productionId: production._id,
          showName,
          type: "show_opened",
        });
      }
    }

    for (const { production, showName } of previewProductions) {
      const lists = await ctx.runQuery(
        internal.crons.getWantToSeeListsContainingShow,
        { showId: production.showId },
      );
      const userIds = [
        ...new Set(lists.map((l: { userId: Id<"users"> }) => l.userId)),
      ];

      for (const userId of userIds) {
        const alreadySent = await ctx.runQuery(
          internal.crons.hasProductionNotification,
          {
            recipientUserId: userId,
            productionId: production._id,
            type: "previews_started",
          },
        );
        if (alreadySent) continue;

        await ctx.runMutation(internal.crons.insertShowMilestoneNotification, {
          recipientUserId: userId,
          showId: production.showId,
          productionId: production._id,
          showName,
          type: "previews_started",
        });
      }
    }
  },
});

export const sendTripReminderAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = addDaysToDateStr(today, 1);

    const reminders: Array<{
      type: TripReminderType;
      field: "startDate" | "endDate";
      date: string;
    }> = [
      { type: "trip_starting_tomorrow", field: "startDate", date: tomorrow },
      { type: "trip_starts_today", field: "startDate", date: today },
      { type: "trip_ends_today", field: "endDate", date: today },
    ];

    for (const reminder of reminders) {
      const trips = await ctx.runQuery(internal.crons.getTripsByDate, {
        date: reminder.date,
        field: reminder.field,
      });

      for (const { trip, recipientUserIds } of trips) {
        for (const userId of recipientUserIds) {
          const alreadySent = await ctx.runQuery(
            internal.crons.hasTripNotification,
            {
              recipientUserId: userId,
              tripId: trip._id,
              type: reminder.type,
            },
          );
          if (alreadySent) continue;

          await ctx.runMutation(internal.crons.insertTripReminderNotification, {
            recipientUserId: userId,
            tripId: trip._id,
            tripName: trip.name,
            type: reminder.type,
          });
        }
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

// Run daily at 9:15 AM ET (14:15 UTC).
crons.daily(
  "show-milestone-alerts",
  { hourUTC: 14, minuteUTC: 15 },
  internal.crons.sendShowMilestoneAlerts,
  {}
);

// Run daily at 9:30 AM ET (14:30 UTC).
crons.daily(
  "trip-reminder-alerts",
  { hourUTC: 14, minuteUTC: 30 },
  internal.crons.sendTripReminderAlerts,
  {}
);

// After closing date + grace, stage `isClosed` / `isOpenRun` fixes on reviewQueue (15:05 UTC).
crons.daily(
  "post-closing-grace-review-queue",
  { hourUTC: 15, minuteUTC: 5 },
  internal.reviewQueue.stagePostClosingGraceSuggestions,
  {}
);

// Daily Ticketmaster enrichment is disabled.
//
// Rationale: TM Discovery posters are usually the wrong aspect ratio for our
// playbill cards, and the daily re-fetch was undoing admin "Clear" actions
// (Clear bypasses the review queue, so the rejected-source guard in
// `setProductionHotlinkImage` doesn't fire on the next run). New productions
// still get a single TM proposal at bot-ingestion time via
// `enrichProductionTicketmaster`, which is enough exposure for admin to keep
// or discard. Re-enable here only if we add a "checked" timestamp / Clear
// also stages a rejected entry, so an admin's removal stays sticky.
//
// The action `internal.imageEnrichment.ticketmaster.enrichProductionImages`
// remains exported and can be invoked manually from the Convex dashboard if
// a one-off batch backfill is ever needed.

// Recompute global theatre ranks daily at 3:00 AM ET (8:00 UTC).
crons.daily(
  "recompute-theatre-ranks",
  { hourUTC: 8, minuteUTC: 0 },
  internal.userStats.recomputeAllRanks,
  {}
);

export default crons;
