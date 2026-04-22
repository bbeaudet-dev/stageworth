import { v } from "convex/values";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getConvexUserId, requireConvexUserId } from "./auth";
import { resolveShowImageUrls } from "./helpers";
import { getBlockEdgeSets } from "./social/safety";

// ─── Push helpers ────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
};

export const savePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await ctx.db.patch(userId, { expoPushToken: args.token });
  },
});

export const removePushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    await ctx.db.patch(userId, { expoPushToken: undefined });
  },
});

export const getUserPushToken = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.expoPushToken ?? null;
  },
});

export const sendPushNotification = internalAction({
  args: {
    recipientUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const token = await ctx.runQuery(internal.notifications.getUserPushToken, {
      userId: args.recipientUserId,
    });

    if (!token || !token.startsWith("ExponentPushToken[")) return;

    const message: ExpoPushMessage = {
      to: token,
      title: args.title,
      body: args.body,
      data: args.data,
      sound: "default",
    };

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(message),
      });
      if (!res.ok) {
        console.error("Expo push failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Expo push error:", err);
    }
  },
});

// ─── Notification queries / mutations ────────────────────────────────────────

export const listForCurrentUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    const { hiddenIds } = await getBlockEdgeSets(ctx, userId);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_createdAt", (q) => q.eq("recipientUserId", userId))
      .order("desc")
      .take(limit);

    const results = await Promise.all(
      notifications.map(async (notif) => {
        let actor = null;
        if (notif.actorKind === "user") {
          if (!notif.actorUserId) return null; // malformed — skip
          if (hiddenIds.has(notif.actorUserId)) return null; // blocked either way
          const actorDoc = await ctx.db.get(notif.actorUserId);
          if (!actorDoc) return null; // actor deleted — drop notification
          const avatarUrl = actorDoc.avatarImage
            ? await ctx.storage.getUrl(actorDoc.avatarImage)
            : null;
          actor = {
            _id: actorDoc._id,
            username: actorDoc.username,
            name: actorDoc.name,
            avatarUrl,
          };
        }

        let show = null;
        if (notif.showId) {
          const showDoc = await ctx.db.get(notif.showId);
          if (showDoc) {
            show = { ...showDoc, images: await resolveShowImageUrls(ctx, showDoc) };
          }
        }

        let trip = null;
        if (notif.tripId) {
          const tripDoc = await ctx.db.get(notif.tripId);
          if (tripDoc) trip = { _id: tripDoc._id, name: tripDoc.name };
        }

        let myTripMembershipStatus: string | null = null;
        if (notif.type === "trip_invite" && notif.tripId) {
          const membership = await ctx.db
            .query("tripMembers")
            .withIndex("by_trip_user", (q: any) =>
              q.eq("tripId", notif.tripId).eq("userId", userId)
            )
            .first();
          myTripMembershipStatus = membership?.status ?? null;
        }

        return {
          _id: notif._id,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          visitId: notif.visitId,
          productionId: notif.productionId ?? null,
          tripId: notif.tripId ?? null,
          myTripMembershipStatus,
          actor,
          show,
          trip,
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return 0;
    const { hiddenIds } = await getBlockEdgeSets(ctx, userId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_isRead", (q) =>
        q.eq("recipientUserId", userId).eq("isRead", false)
      )
      .collect();
    // Don't show badge counts from blocked users.
    const visible = unread.filter(
      (n) => !(n.actorKind === "user" && n.actorUserId && hiddenIds.has(n.actorUserId))
    );
    return visible.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const notif = await ctx.db.get(args.notificationId);
    if (!notif) throw new Error("Notification not found");
    if (notif.recipientUserId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_isRead", (q) =>
        q.eq("recipientUserId", userId).eq("isRead", false)
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});
