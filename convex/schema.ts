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
    images: v.array(v.id("_storage")),
    isUserCreated: v.boolean(),
  }).index("by_name", ["name"]),

  // A specific physical run of a show at a specific venue.
  // e.g. "Hamilton, original Broadway, Richard Rodgers Theatre, Jul 2015 – Jan 2020"
  productions: defineTable({
    showId: v.id("shows"),
    theatre: v.string(),
    city: v.optional(v.string()),
    district: v.union(
      v.literal("broadway"),
      v.literal("off_broadway"),
      v.literal("off_off_broadway"),
      v.literal("west_end"),
      v.literal("touring"),
      v.literal("regional"),
      v.literal("other")
    ),
    // null = not yet announced/unknown
    previewDate: v.optional(v.string()),
    // null = not yet announced/unknown; show is "in previews" while openingDate > today
    openingDate: v.optional(v.string()),
    // null = no announced closing / open run
    closingDate: v.optional(v.string()),
    productionType: v.union(
      v.literal("original"),
      v.literal("revival"),
      v.literal("transfer"),
      v.literal("touring"),
      v.literal("concert"),
      v.literal("workshop"),
      v.literal("other")
    ),
    posterImage: v.optional(v.id("_storage")),
    // false = seeded/curated data; true = added manually by a user
    isUserCreated: v.boolean(),
    // Hook for future sync with IBDB, Playbill, etc.
    externalId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_show", ["showId"])
    .index("by_district", ["district"])
    .index("by_closing_date", ["closingDate"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    username: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    avatarImage: v.optional(v.id("_storage")),
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
    wouldSeeAgainLineIndex: v.optional(v.number()),
    stayedHomeLineIndex: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Junction table: per-show metadata for each user.
  // Stores the tier (loved/liked/okay/disliked/unranked) and when the show was added.
  userShows: defineTable({
    userId: v.id("users"),
    showId: v.id("shows"),
    tier: v.union(
      v.literal("loved"),
      v.literal("liked"),
      v.literal("okay"),
      v.literal("disliked"),
      v.literal("unranked")
    ),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_show", ["userId", "showId"]),

  userLists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    kind: v.union(v.literal("system"), v.literal("custom")),
    systemKey: v.optional(
      v.union(
        v.literal("want_to_see"),
        v.literal("look_into"),
        v.literal("not_interested"),
        v.literal("uncategorized")
      )
    ),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    showIds: v.array(v.id("shows")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_systemKey", ["userId", "systemKey"])
    .index("by_user_name", ["userId", "name"]),

  visits: defineTable({
    userId: v.id("users"),
    // Denormalized from production for easier querying when productionId is absent.
    showId: v.id("shows"),
    productionId: v.optional(v.id("productions")),
    date: v.string(),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    district: v.optional(
      v.union(
        v.literal("broadway"),
        v.literal("off_broadway"),
        v.literal("off_off_broadway"),
        v.literal("west_end"),
        v.literal("touring"),
        v.literal("regional"),
        v.literal("other")
      )
    ),
    seat: v.optional(v.string()),
    isMatinee: v.optional(v.boolean()),
    isPreview: v.optional(v.boolean()),
    isFinalPerformance: v.optional(v.boolean()),
    // Notable cast members seen at this performance.
    cast: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  })
    .index("by_user_show", ["userId", "showId"])
    .index("by_user", ["userId"])
    .index("by_user_production", ["userId", "productionId"]),

  follows: defineTable({
    followerUserId: v.id("users"),
    followingUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerUserId"])
    .index("by_following", ["followingUserId"])
    .index("by_follower_following", ["followerUserId", "followingUserId"]),

  activityPosts: defineTable({
    actorUserId: v.id("users"),
    type: v.union(v.literal("visit_created")),
    visitId: v.id("visits"),
    showId: v.id("shows"),
    productionId: v.optional(v.id("productions")),
    visitDate: v.string(),
    notes: v.optional(v.string()),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    rankAtPost: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_actor_createdAt", ["actorUserId", "createdAt"]),
});
