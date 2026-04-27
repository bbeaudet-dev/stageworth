/**
 * Centralized notification dispatching.
 *
 * All notification + push creation should flow through `notifyUser` so the
 * user's `notificationSettings` preferences are honored in one place. Before
 * this existed, push and in-app notifications were inserted inline at ~8 call
 * sites and the preferences screen was effectively a no-op.
 *
 * The helper:
 *   1. Looks up the recipient's preferences via `userPreferences`.
 *   2. Maps the notification type to a preferences key and returns early if
 *      the user has opted out.
 *   3. Inserts the `notifications` row.
 *   4. Schedules an Expo push notification.
 *
 * Missing preferences (old user rows or undefined fields) default to enabled
 * so we never silently drop notifications after adding new types.
 */

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

export type NotifType =
  | "visit_tag"
  | "visit_tag_accepted"
  | "visit_tag_declined"
  | "new_follow"
  | "trip_invite"
  | "trip_invite_accepted"
  | "trip_invite_declined"
  | "trip_starting_tomorrow"
  | "trip_starts_today"
  | "trip_ends_today"
  | "post_like"
  | "show_announced"
  | "show_opened"
  | "previews_started"
  | "closing_soon";

type NotifSettingsKey =
  | "follows"
  | "visitTags"
  | "tripInvites"
  | "tripReminders"
  | "closingSoon"
  | "showAnnounced"
  | "showOpenings"
  | "previewsStarted"
  | "postLikes";

const PREF_KEY_BY_TYPE: Record<NotifType, NotifSettingsKey | null> = {
  visit_tag: "visitTags",
  visit_tag_accepted: "visitTags",
  visit_tag_declined: "visitTags",
  new_follow: "follows",
  trip_invite: "tripInvites",
  trip_invite_accepted: "tripInvites",
  trip_invite_declined: "tripInvites",
  trip_starting_tomorrow: "tripReminders",
  trip_starts_today: "tripReminders",
  trip_ends_today: "tripReminders",
  post_like: "postLikes",
  show_announced: "showAnnounced",
  show_opened: "showOpenings",
  previews_started: "previewsStarted",
  closing_soon: "closingSoon",
};

export async function isNotifTypeEnabled(
  ctx: MutationCtx,
  userId: Id<"users">,
  type: NotifType,
): Promise<boolean> {
  const key = PREF_KEY_BY_TYPE[type];
  if (!key) return true;

  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const settings = prefs?.notificationSettings;
  if (!settings) return true;
  const value = (settings as Record<string, boolean | undefined>)[key];
  return value !== false;
}

export type NotifyUserArgs = {
  recipientUserId: Id<"users">;
  actorKind: "user" | "system";
  actorUserId?: Id<"users">;
  type: NotifType;
  visitId?: Id<"visits">;
  showId?: Id<"shows">;
  productionId?: Id<"productions">;
  postId?: Id<"activityPosts">;
  tripId?: Id<"trips">;
  /** When set, Expo push is scheduled for this recipient. */
  push?: {
    title: string;
    body: string;
    data?: Record<string, string>;
  };
};

/**
 * Inserts a notification row and (optionally) schedules a push notification —
 * but only if the recipient's preferences allow this category. Safe to call
 * for actor === recipient; callers should guard self-notifications themselves.
 */
export async function notifyUser(
  ctx: MutationCtx,
  args: NotifyUserArgs,
): Promise<void> {
  if (!(await isNotifTypeEnabled(ctx, args.recipientUserId, args.type))) return;

  await ctx.db.insert("notifications", {
    recipientUserId: args.recipientUserId,
    actorKind: args.actorKind,
    actorUserId: args.actorUserId,
    type: args.type,
    visitId: args.visitId,
    showId: args.showId,
    productionId: args.productionId,
    postId: args.postId,
    tripId: args.tripId,
    isRead: false,
    createdAt: Date.now(),
  });

  if (args.push) {
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendPushNotification,
      {
        recipientUserId: args.recipientUserId,
        title: args.push.title,
        body: args.push.body,
        data: args.push.data,
      },
    );
  }
}
