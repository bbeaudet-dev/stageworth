import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shows: defineTable({
    name: v.string(),
    normalizedName: v.string(),
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
    externalSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_normalized_name", ["normalizedName"])
    .index("by_external_source_id", ["externalSource", "externalId"]),

  // A specific physical run of a show at a specific venue.
  // e.g. "Hamilton, original Broadway, Richard Rodgers Theatre, Jul 2015 – Jan 2020"
  productions: defineTable({
    showId: v.id("shows"),
    theatre: v.optional(v.string()),
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
    // true = explicitly confirmed as an open run (no closing date planned).
    // false = closing date not yet announced but not confirmed as open run.
    // undefined/null = unknown.
    isOpenRun: v.optional(v.boolean()),
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

  venues: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    aliases: v.optional(v.array(v.string())),
    addressLine1: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.string(),
    district: v.union(
      v.literal("broadway"),
      v.literal("off_broadway"),
      v.literal("off_off_broadway"),
      v.literal("west_end"),
      v.literal("touring"),
      v.literal("regional"),
      v.literal("other")
    ),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    googlePlaceId: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    ingestionConfidence: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalized_name", ["normalizedName"])
    .index("by_city_normalized_name", ["city", "normalizedName"])
    .index("by_city", ["city"])
    .index("by_district", ["district"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    username: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    avatarImage: v.optional(v.id("_storage")),
    betterAuthUserId: v.string(),
    expoPushToken: v.optional(v.string()),
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
    venueId: v.optional(v.id("venues")),
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
    taggedUserIds: v.optional(v.array(v.id("users"))),
  })
    .index("by_user_show", ["userId", "showId"])
    .index("by_user", ["userId"])
    .index("by_user_production", ["userId", "productionId"])
    .index("by_venue", ["venueId"]),

  follows: defineTable({
    followerUserId: v.id("users"),
    followingUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerUserId"])
    .index("by_following", ["followingUserId"])
    .index("by_follower_following", ["followerUserId", "followingUserId"]),

  notifications: defineTable({
    recipientUserId: v.id("users"),
    // "user" = triggered by another user; "system" = bot/cron-generated
    actorKind: v.union(v.literal("user"), v.literal("system")),
    actorUserId: v.optional(v.id("users")),
    type: v.union(
      // user-actor types
      v.literal("visit_tag"),
      v.literal("new_follow"),
      // system-actor types
      v.literal("show_announced"),
      v.literal("closing_soon"),
    ),
    visitId: v.optional(v.id("visits")),
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient_createdAt", ["recipientUserId", "createdAt"])
    .index("by_recipient_isRead", ["recipientUserId", "isRead"]),

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
    taggedUserIds: v.optional(v.array(v.id("users"))),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_actor_createdAt", ["actorUserId", "createdAt"]),

  trips: defineTable({
    userId: v.id("users"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_startDate", ["userId", "startDate"]),

  // Free-text notes added to a specific day of a trip (flights, meals, etc.)
  tripDayNotes: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    dayDate: v.string(),
    text: v.string(),
    // Optional time in 24h "HH:MM" format
    time: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_day", ["tripId", "dayDate"]),

  // One row per show added to a trip. dayDate is set when the show is assigned to a day.
  tripShows: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    showId: v.id("shows"),
    dayDate: v.optional(v.string()),
    order: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_day", ["tripId", "dayDate"])
    .index("by_user", ["userId"])
    .index("by_trip_show", ["tripId", "showId"]),

  tripMembers: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    invitedBy: v.id("users"),
    role: v.union(v.literal("view"), v.literal("edit")),
    // Invitation flow (accept/decline) is deferred; members added directly as "accepted" for now.
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_user", ["userId"])
    .index("by_trip_user", ["tripId", "userId"]),

  // Per-member preference for a show on a trip (not a competitive vote).
  tripShowLabels: defineTable({
    tripId: v.id("trips"),
    tripShowId: v.id("tripShows"),
    userId: v.id("users"),
    label: v.union(
      v.literal("must_see"),
      v.literal("want_see"),
      v.literal("indifferent"),
      v.literal("dont_know"),
      v.literal("dont_want")
    ),
    updatedAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_show_user", ["tripId", "tripShowId", "userId"]),

  // Ephemeral "viewing this trip" heartbeats for the trip detail screen.
  tripPresence: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    lastSeenAt: v.number(),
    activeTab: v.optional(v.union(v.literal("shows"), v.literal("party"), v.literal("chat"))),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_user", ["tripId", "userId"]),
});
