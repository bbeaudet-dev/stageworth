import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

const INVITE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const WEBSITE_URL =
  process.env.WEBSITE_URL || "https://theatre-diary.vercel.app";

export const createInviteLink = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("inviteLinks")
      .withIndex("by_createdByUserId", (q) => q.eq("createdByUserId", userId))
      .order("desc")
      .first();

    if (
      existing &&
      !existing.claimedByUserId &&
      existing.expiresAt > now
    ) {
      return {
        token: existing.token,
        shareableUrl: `${WEBSITE_URL}/invite/${existing.token}`,
        expiresAt: existing.expiresAt,
      };
    }

    const token = crypto.randomUUID();
    const expiresAt = now + INVITE_EXPIRY_MS;

    await ctx.db.insert("inviteLinks", {
      token,
      createdByUserId: userId,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      token,
      shareableUrl: `${WEBSITE_URL}/invite/${token}`,
      expiresAt,
    };
  },
});

export const claimInviteLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const now = Date.now();

    const link = await ctx.db
      .query("inviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) return { success: false, reason: "not_found" as const };
    if (link.expiresAt < now) return { success: false, reason: "expired" as const };
    if (link.claimedByUserId) return { success: false, reason: "already_claimed" as const };
    if (link.createdByUserId === userId) return { success: false, reason: "self_invite" as const };

    const existingClaim = await ctx.db
      .query("inviteLinks")
      .withIndex("by_claimedByUserId", (q) => q.eq("claimedByUserId", userId))
      .first();
    if (existingClaim) return { success: false, reason: "already_referred" as const };

    await ctx.db.patch(link._id, {
      claimedByUserId: userId,
      claimedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getMyInviteStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return null;

    const links = await ctx.db
      .query("inviteLinks")
      .withIndex("by_createdByUserId", (q) => q.eq("createdByUserId", userId))
      .collect();

    const totalLinks = links.length;
    const claimedLinks = links.filter((l) => !!l.claimedByUserId).length;

    return { totalLinks, claimedLinks };
  },
});
