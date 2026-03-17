import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

const MAX_BIO_LENGTH = 280;
const MAX_LOCATION_LENGTH = 80;
const MAX_NAME_LENGTH = 80;

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

async function getPublicProfileData(
  ctx: any,
  targetUserId: string,
  viewerUserId: string | null
) {
  const user = await ctx.db.get(targetUserId);
  if (!user) return null;

  const [followers, following] = await Promise.all([
    ctx.db
      .query("follows")
      .withIndex("by_following", (q: any) => q.eq("followingUserId", targetUserId))
      .collect(),
    ctx.db
      .query("follows")
      .withIndex("by_follower", (q: any) => q.eq("followerUserId", targetUserId))
      .collect(),
  ]);

  let viewerFollows = false;
  if (viewerUserId) {
    const followRow = await ctx.db
      .query("follows")
      .withIndex("by_follower_following", (q: any) =>
        q.eq("followerUserId", viewerUserId).eq("followingUserId", targetUserId)
      )
      .first();
    viewerFollows = followRow !== null;
  }

  const avatarUrl = user.avatarImage
    ? await ctx.storage.getUrl(user.avatarImage)
    : null;

  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    bio: user.bio,
    location: user.location,
    avatarUrl,
    followerCount: followers.length,
    followingCount: following.length,
    viewerIsSelf: viewerUserId === user._id,
    viewerFollows,
  };
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return null;
    return await getPublicProfileData(ctx, userId, userId);
  },
});

export const getPublicProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.username.trim().toLowerCase();
    if (!normalized) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();
    if (!user) return null;

    const viewerUserId = await getConvexUserId(ctx);
    return await getPublicProfileData(ctx, user._id, viewerUserId);
  },
});

export const getPublicProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewerUserId = await getConvexUserId(ctx);
    return await getPublicProfileData(ctx, args.userId, viewerUserId);
  },
});

export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    avatarImage: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const nextName = normalizeOptionalText(args.name);
    const nextBio = normalizeOptionalText(args.bio);
    const nextLocation = normalizeOptionalText(args.location);

    if (nextName && nextName.length > MAX_NAME_LENGTH) {
      throw new Error("Name is too long");
    }
    if (nextBio && nextBio.length > MAX_BIO_LENGTH) {
      throw new Error("Bio is too long");
    }
    if (nextLocation && nextLocation.length > MAX_LOCATION_LENGTH) {
      throw new Error("Location is too long");
    }

    await ctx.db.patch(userId, {
      name: nextName,
      bio: nextBio,
      location: nextLocation,
      avatarImage: args.avatarImage === null ? undefined : args.avatarImage,
      updatedAt: Date.now(),
    });
  },
});
