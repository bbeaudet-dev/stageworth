import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { getConvexUserId, requireConvexUserId } from "./auth";

const MAX_NAME_LENGTH = 80;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_REGEX = /^[a-z0-9_]+$/;

const TIER_ORDER = ["loved", "liked", "okay", "disliked", "unranked"] as const;
type Tier = (typeof TIER_ORDER)[number];

function getTierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function getTierBoundaries(
  showIds: string[],
  tierByShowId: Map<string, Tier>,
  tier: Tier
) {
  let start = -1;
  let end = -1;
  for (let i = 0; i < showIds.length; i += 1) {
    if (tierByShowId.get(showIds[i]) !== tier) continue;
    if (start === -1) start = i;
    end = i;
  }
  return { start, end };
}

function getBottomInsertionIndexForTier(
  showIds: string[],
  tierByShowId: Map<string, Tier>,
  selectedTier: Tier
) {
  const sameTierBounds = getTierBoundaries(showIds, tierByShowId, selectedTier);
  if (sameTierBounds.end !== -1) return sameTierBounds.end + 1;

  let insertAt = showIds.length;
  const selectedTierRank = getTierRank(selectedTier);
  for (let i = 0; i < showIds.length; i += 1) {
    const existingTier = tierByShowId.get(showIds[i]);
    if (!existingTier) continue;
    if (getTierRank(existingTier) > selectedTierRank) {
      insertAt = i;
      break;
    }
  }
  return insertAt;
}

function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, MAX_USERNAME_LENGTH);
}

function validateUsernameOrThrow(username: string) {
  if (username.length < MIN_USERNAME_LENGTH) {
    throw new Error("Username must be at least 3 characters");
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    throw new Error("Username must be at most 20 characters");
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error(
      "Username may only contain lowercase letters, numbers, and underscores"
    );
  }
}

/**
 * Returns the current onboarding state for the authenticated user. Treats a
 * missing `onboardingPhase` as "complete" for legacy rows. Returns null when
 * unauthenticated so the client can avoid redirect loops while signing in.
 */
export const getOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      phase: user.onboardingPhase ?? "complete",
      name: user.name ?? null,
      username: user.username,
      hasAvatarImage: !!user.avatarImage,
    };
  },
});

export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const candidate = sanitizeUsername(args.username);
    if (candidate.length < MIN_USERNAME_LENGTH) {
      return { available: false, reason: "too_short" as const, candidate };
    }
    const userId = await getConvexUserId(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .first();
    if (existing && existing._id !== userId) {
      return { available: false, reason: "taken" as const, candidate };
    }
    return { available: true, reason: null, candidate };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireConvexUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const completeProfilePhase = mutation({
  args: {
    // Name is optional per Apple Sign-in HIG: when the auth provider already
    // gave us a name we must not re-require it, and when it didn't we still
    // don't gate onboarding on it.
    name: v.optional(v.string()),
    username: v.string(),
    avatarImage: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const trimmedName = args.name?.trim() ?? "";
    if (trimmedName.length > MAX_NAME_LENGTH) {
      throw new Error("Name is too long");
    }

    const candidateUsername = sanitizeUsername(args.username);
    validateUsernameOrThrow(candidateUsername);

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (candidateUsername !== user.username) {
      const conflict = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", candidateUsername))
        .first();
      if (conflict && conflict._id !== userId) {
        throw new Error("Username is taken");
      }
    }

    await ctx.db.patch(userId, {
      name: trimmedName ? trimmedName : undefined,
      username: candidateUsername,
      avatarImage:
        args.avatarImage === null
          ? undefined
          : args.avatarImage ?? user.avatarImage,
      onboardingPhase: "shows",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Hydrates fields that social providers gave us but that better-auth can't
 * thread through `signIn.social` directly — specifically Apple's `fullName`
 * (returned only on the very first sign-in, never embedded in the id token)
 * and the provider's profile picture URL.
 *
 * Called by the client immediately after `authClient.signIn.social` resolves.
 *
 * Idempotent: we only patch `name` when it's currently empty, and only kick
 * off an avatar import when the user has no uploaded `avatarImage` yet, so
 * repeat sign-ins never clobber fields the user has curated.
 */
export const hydrateSocialIdentity = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // The social sign-in flow fires this as soon as the auth client resolves,
    // but there's a small window where the Convex session hasn't propagated
    // yet. Silently no-op in that case — the client retries via onboarding.
    const userId = await getConvexUserId(ctx);
    if (!userId) return;
    const user = await ctx.db.get(userId);
    if (!user) return;

    const patch: { name?: string; updatedAt?: number } = {};

    const trimmedName = args.name?.trim();
    if (trimmedName && trimmedName.length <= MAX_NAME_LENGTH && !user.name) {
      patch.name = trimmedName;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = Date.now();
      await ctx.db.patch(userId, patch);
    }

    if (
      !user.avatarImage &&
      args.imageUrl &&
      typeof args.imageUrl === "string" &&
      args.imageUrl.startsWith("https://")
    ) {
      await ctx.scheduler.runAfter(0, internal.onboarding.importAvatarFromUrl, {
        userId,
        imageUrl: args.imageUrl,
      });
    }
  },
});

/**
 * Fetches an OAuth-provided profile image, stores the bytes in Convex storage,
 * and patches `avatarImage` on the user row. Runs only when no custom avatar
 * has been set, so user-curated images are never overwritten.
 *
 * Runs in an action because mutations can't make outbound HTTP requests.
 */
export const importAvatarFromUrl = internalAction({
  args: {
    userId: v.id("users"),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(args.imageUrl);
      if (!response.ok) return;
      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      // Guard against accidentally fetching something huge.
      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : null;
      if (contentLength !== null && contentLength > 5 * 1024 * 1024) return;

      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) return;

      const storageId = await ctx.storage.store(blob);
      await ctx.runMutation(internal.onboarding.setAvatarFromImport, {
        userId: args.userId,
        avatarImage: storageId,
      });
    } catch {
      // Best-effort import — if it fails we just leave the session image as a
      // visual fallback and the user can pick one manually.
    }
  },
});

export const setAvatarFromImport = internalMutation({
  args: {
    userId: v.id("users"),
    avatarImage: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    // Race guard: if the user already picked a custom avatar between when we
    // scheduled the fetch and when it completed, keep the user's choice.
    if (user.avatarImage) return;
    await ctx.db.patch(args.userId, {
      avatarImage: args.avatarImage,
      updatedAt: Date.now(),
    });
  },
});

export const completeShowsPhase = mutation({
  args: {
    showIds: v.array(v.id("shows")),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);

    const rankings = await ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!rankings) throw new Error("Rankings not found");

    const userShows = await ctx.db
      .query("userShows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tierByShowId = new Map<string, Tier>(
      userShows.map((userShow) => [userShow.showId, userShow.tier as Tier])
    );
    const userShowByShowId = new Map<string, (typeof userShows)[number]>(
      userShows.map((userShow) => [
        userShow.showId as unknown as string,
        userShow,
      ])
    );
    const rankedSet = new Set<string>(rankings.showIds);

    let nextShowIds: Id<"shows">[] = [...rankings.showIds];
    const now = Date.now();

    const seen = new Set<string>();
    for (const showId of args.showIds) {
      const key = showId as unknown as string;
      if (seen.has(key)) continue;
      seen.add(key);

      const existingUserShow = userShowByShowId.get(key);
      if (existingUserShow) {
        if (existingUserShow.tier !== "loved") {
          await ctx.db.patch(existingUserShow._id, { tier: "loved" });
          tierByShowId.set(key, "loved");
        }
      } else {
        await ctx.db.insert("userShows", {
          userId,
          showId,
          tier: "loved",
          addedAt: now,
        });
        tierByShowId.set(key, "loved");
      }

      if (!rankedSet.has(key)) {
        const insertionIndex = getBottomInsertionIndexForTier(
          nextShowIds as unknown as string[],
          tierByShowId,
          "loved"
        );
        nextShowIds.splice(insertionIndex, 0, showId);
        rankedSet.add(key);
      }
    }

    if (nextShowIds.length !== rankings.showIds.length) {
      await ctx.db.patch(rankings._id, { showIds: nextShowIds });
    }

    await ctx.db.patch(userId, {
      onboardingPhase: "complete",
      onboardingCompletedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Allows users to back out of the second phase if they want to revisit phase 1
 * (not currently exposed in UI but useful for support / reset scripts).
 */
export const resetOnboarding = mutation({
  args: {
    phase: v.union(
      v.literal("profile"),
      v.literal("shows"),
      v.literal("complete")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await ctx.db.patch(userId, {
      onboardingPhase: args.phase,
      updatedAt: Date.now(),
    });
  },
});
