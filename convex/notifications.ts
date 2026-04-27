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

/**
 * Reads a specific notification-type preference. Used from internal actions
 * (which can't use the `notifyUser` helper directly because they don't hold a
 * MutationCtx) to skip push fan-out for users who have opted out.
 */
export const isUserNotifTypeEnabled = internalQuery({
  args: {
    userId: v.id("users"),
    settingKey: v.union(
      v.literal("follows"),
      v.literal("visitTags"),
      v.literal("tripInvites"),
      v.literal("tripReminders"),
      v.literal("closingSoon"),
      v.literal("showAnnounced"),
      v.literal("showOpenings"),
      v.literal("previewsStarted"),
      v.literal("postLikes"),
    ),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const settings = prefs?.notificationSettings;
    if (!settings) return true;
    const value = (settings as Record<string, boolean | undefined>)[args.settingKey];
    return value !== false;
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

        let myVisitParticipantStatus: string | null = null;
        if (notif.type === "visit_tag" && notif.visitId) {
          const participant = await ctx.db
            .query("visitParticipants")
            .withIndex("by_visit_user", (q: any) =>
              q.eq("visitId", notif.visitId).eq("userId", userId),
            )
            .first();
          myVisitParticipantStatus = participant?.status ?? null;
        }

        return {
          _id: notif._id,
          type: notif.type,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          visitId: notif.visitId,
          productionId: notif.productionId ?? null,
          postId: notif.postId ?? null,
          tripId: notif.tripId ?? null,
          myTripMembershipStatus,
          myVisitParticipantStatus,
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
  // Accept an optional set of types so the notifications screen can mark only
  // the active inbox tab (e.g. just "post_like" on the Posts tab) as read.
  // Omitting `types` marks every unread notification as read.
  args: { types: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_isRead", (q) =>
        q.eq("recipientUserId", userId).eq("isRead", false)
      )
      .collect();
    const filtered =
      args.types && args.types.length > 0
        ? unread.filter((n) => args.types!.includes(n.type))
        : unread;
    await Promise.all(filtered.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});
