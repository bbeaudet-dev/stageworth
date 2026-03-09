import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shows: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("musical"),
      v.literal("play"),
      v.literal("opera"),
      v.literal("dance"),
      v.literal("other")
    ),
    subtype: v.optional(v.string()),
    images: v.array(v.string()),
    isUserCreated: v.boolean(),
  }).index("by_name", ["name"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    username: v.string(),
    betterAuthUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_betterAuthUserId", ["betterAuthUserId"]),

  // Ordered array of show IDs — the source of truth for ranking order.
  // One document per user. Rank = array index + 1.
  userRankings: defineTable({
    userId: v.id("users"),
    showIds: v.array(v.id("shows")),
  }).index("by_user", ["userId"]),

  // Junction table: per-show metadata for each user.
  // Stores the tier (liked/neutral/disliked) and when the show was added.
  userShows: defineTable({
    userId: v.id("users"),
    showId: v.id("shows"),
    tier: v.union(
      v.literal("liked"),
      v.literal("neutral"),
      v.literal("disliked")
    ),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_show", ["userId", "showId"]),
});
