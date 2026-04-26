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
      v.literal("revue"),
      v.literal("comedy"),
      v.literal("magic"),
      v.literal("other")
    ),
    subtype: v.optional(v.string()),
    images: v.array(v.id("_storage")),
    // Hotlinked image URL from Wikipedia CDN or Ticketmaster CDN.
    // Used when images[] is empty. Never download fair-use Wikipedia bytes.
    hotlinkImageUrl: v.optional(v.string()),
    hotlinkImageSource: v.optional(
      v.union(v.literal("wikipedia"), v.literal("ticketmaster"))
    ),
    wikipediaTitle: v.optional(v.string()),
    ticketmasterAttractionId: v.optional(v.string()),
    // ShowScore audience rating (0–100 scale)
    showScoreRating: v.optional(v.number()),
    showScoreCount: v.optional(v.string()),
    showScoreSlug: v.optional(v.string()),
    showScoreUpdatedAt: v.optional(v.number()),
    isUserCreated: v.boolean(),
    externalSource: v.optional(v.string()),
    externalId: v.optional(v.string()),
    sourceConfidence: v.optional(v.number()),
    // Admin review status — undefined treated as "needs_review".
    dataStatus: v.optional(
      v.union(
        v.literal("needs_review"),
        v.literal("partial"),
        v.literal("complete")
      )
    ),
    // Show-level description (tagline/synopsis/plot blurb). UI renders this
    // with a "Read more" truncation, so source-variable length is fine.
    // Sourced from Playbill (preferred) or Wikipedia (long-tail fallback).
    description: v.optional(v.string()),
    descriptionSource: v.optional(
      v.union(
        v.literal("playbill"),
        v.literal("wikipedia"),
        v.literal("admin")
      )
    ),
    descriptionUpdatedAt: v.optional(v.number()),
    // Timestamp of the last Wikipedia fallback attempt (success or miss).
    // Used to avoid re-checking shows that already have no Wikipedia match.
    descriptionCheckedAt: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_normalized_name", ["normalizedName"])
    .index("by_external_source_id", ["externalSource", "externalId"])
    .index("by_dataStatus", ["dataStatus"]),

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
    // true = explicitly confirmed as closed (e.g. opening date recorded but no closing date).
    // Counterpart to isOpenRun — disambiguates "missing closing date" from "actually closed".
    isClosed: v.optional(v.boolean()),
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
    // Hotlinked poster URL from Ticketmaster CDN for this specific production.
    hotlinkPosterUrl: v.optional(v.string()),
    ticketmasterEventId: v.optional(v.string()),
    ticketmasterEventUrl: v.optional(v.string()),
    // false = seeded/curated data; true = added manually by a user
    isUserCreated: v.boolean(),
    // Playbill production slug, e.g. "hamilton-richard-rodgers-theatre-vault-0000000029".
    // Used to construct the Playbill URL and drive scheduled enrichment.
    playbillProductionId: v.optional(v.string()),
    // Hook for future sync with IBDB, Playbill, etc.
    externalId: v.optional(v.string()),
    // Running time in minutes (total, including any intermission), e.g. 150 for "2h 30m".
    runningTime: v.optional(v.number()),
    // Number of intermissions: 0 = none, 1 = one, 2 = two (rare). Undefined = unknown.
    intermissionCount: v.optional(v.number()),
    // Total intermission time in minutes (all intermissions combined). Undefined = unknown.
    intermissionMinutes: v.optional(v.number()),
    // Short synopsis / description for this specific production.
    // Used as the show-level description when no show-level description exists.
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Admin review status — undefined treated as "needs_review".
    dataStatus: v.optional(
      v.union(
        v.literal("needs_review"),
        v.literal("partial"),
        v.literal("complete")
      )
    ),
    // Weekly Playbill showtime schedule for currently-running Broadway productions.
    // Synced by the weekly-showtimes GitHub Action via POST /showtimes/sync.
    weeklySchedule: v.optional(
      v.object({
        weekOf: v.string(),
        mon: v.array(v.string()),
        tue: v.array(v.string()),
        wed: v.array(v.string()),
        thu: v.array(v.string()),
        fri: v.array(v.string()),
        sat: v.array(v.string()),
        sun: v.array(v.string()),
      })
    ),
  })
    .index("by_show", ["showId"])
    .index("by_district", ["district"])
    .index("by_closing_date", ["closingDate"])
    .index("by_dataStatus", ["dataStatus"]),

  // Weekly Broadway showtime snapshots staged for manual admin approval.
  showtimesReviews: defineTable({
    weekOf: v.string(),
    fetchedAt: v.number(),
    source: v.literal("playbill"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    shows: v.array(
      v.object({
        title: v.string(),
        schedule: v.object({
          mon: v.array(v.string()),
          tue: v.array(v.string()),
          wed: v.array(v.string()),
          thu: v.array(v.string()),
          fri: v.array(v.string()),
          sat: v.array(v.string()),
          sun: v.array(v.string()),
        }),
      })
    ),
    matchedCount: v.number(),
    unmatchedTitles: v.array(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),
    applyResult: v.optional(
      v.object({
        matched: v.array(v.string()),
        unmatched: v.array(v.string()),
      })
    ),
    // Playbill titles from `shows` that have been written to their productions
    // via per-show approval. Used so a proposal can be partially approved and
    // auto-flipped to "approved" once every applicable title is applied.
    appliedTitles: v.optional(v.array(v.string())),
  })
    .index("by_status", ["status"])
    .index("by_weekOf", ["weekOf"]),

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
    onboardingPhase: v.optional(
      v.union(
        v.literal("profile"),
        v.literal("shows"),
        v.literal("complete")
      )
    ),
    onboardingCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_betterAuthUserId", ["betterAuthUserId"]),

  inviteLinks: defineTable({
    token: v.string(),
    createdByUserId: v.id("users"),
    claimedByUserId: v.optional(v.id("users")),
    claimedAt: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_claimedByUserId", ["claimedByUserId"]),

  // Ordered array of show IDs — the source of truth for ranking order.
  // One document per user. Rank = array index + 1.
  userRankings: defineTable({
    userId: v.id("users"),
    showIds: v.array(v.id("shows")),
    wouldSeeAgainLineIndex: v.optional(v.number()),
    stayedHomeLineIndex: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Append-only history of a user's ranking state after meaningful changes.
  // `userRankings` remains the hot current-state document; snapshots power
  // timeline/date views and future per-show rank history charts.
  userRankingSnapshots: defineTable({
    userId: v.id("users"),
    capturedAt: v.number(),
    source: v.union(
      v.literal("my_shows_save"),
      v.literal("add_visit"),
      v.literal("accept_visit"),
      v.literal("direct_ranking"),
      v.literal("migration")
    ),
    showIds: v.array(v.id("shows")),
    tiers: v.array(
      v.object({
        showId: v.id("shows"),
        tier: v.union(
          v.literal("loved"),
          v.literal("liked"),
          v.literal("okay"),
          v.literal("disliked"),
          v.literal("unranked")
        ),
      })
    ),
    wouldSeeAgainLineIndex: v.optional(v.number()),
    stayedHomeLineIndex: v.optional(v.number()),
    totalRanked: v.number(),
    totalShows: v.number(),
    changeSummary: v.object({
      addedShowIds: v.array(v.id("shows")),
      removedShowIds: v.array(v.id("shows")),
      reorderedShowIds: v.array(v.id("shows")),
      addedCount: v.number(),
      removedCount: v.number(),
      reorderedCount: v.number(),
      removedVisitCount: v.number(),
    }),
  })
    .index("by_user_capturedAt", ["userId", "capturedAt"])
    .index("by_user_source_capturedAt", ["userId", "source", "capturedAt"]),

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
    // Free-text labels for people not on the app (e.g. "mom", "dad"). These
    // are not linked to any user record and never trigger notifications.
    taggedGuestNames: v.optional(v.array(v.string())),
  })
    .index("by_user_show", ["userId", "showId"])
    .index("by_user", ["userId"])
    .index("by_user_production", ["userId", "productionId"])
    .index("by_venue", ["venueId"]),

  // Tracks a tagged user's relationship to a shared visit. The visit's
  // `taggedUserIds` cache stays canonical for "who was tagged"; this table
  // owns acceptance state and per-user notes.
  visitParticipants: defineTable({
    visitId: v.id("visits"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    notes: v.optional(v.string()),
    invitedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_visit", ["visitId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_visit_user", ["visitId", "userId"]),

  follows: defineTable({
    followerUserId: v.id("users"),
    followingUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerUserId"])
    .index("by_following", ["followingUserId"])
    .index("by_follower_following", ["followerUserId", "followingUserId"]),

  // Symmetric user blocks. Insertion by A blocking B hides both directions
  // of content/social surfaces. See convex/social/safety.ts.
  userBlocks: defineTable({
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerUserId"])
    .index("by_blocked", ["blockedUserId"])
    .index("by_blocker_blocked", ["blockerUserId", "blockedUserId"]),

  // User-submitted reports of content or users for safety review.
  // targetUserId is always set to the user being reported (actor of the post
  // for activityPost/visit reports), so admins can slice by target user.
  userReports: defineTable({
    reporterUserId: v.id("users"),
    targetKind: v.union(
      v.literal("user"),
      v.literal("activityPost"),
      v.literal("visit")
    ),
    targetUserId: v.id("users"),
    targetPostId: v.optional(v.id("activityPosts")),
    targetVisitId: v.optional(v.id("visits")),
    reason: v.union(
      v.literal("spam"),
      v.literal("harassment"),
      v.literal("hate"),
      v.literal("sexual"),
      v.literal("violence"),
      v.literal("self_harm"),
      v.literal("impersonation"),
      v.literal("other")
    ),
    details: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("reviewed"),
      v.literal("actioned"),
      v.literal("dismissed")
    ),
    // Denormalized content at report time so admin can see what was reported
    // even if the target is later deleted or edited.
    contentSnapshot: v.optional(v.string()),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewerNote: v.optional(v.string()),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_target_user", ["targetUserId"])
    .index("by_reporter", ["reporterUserId"]),

  notifications: defineTable({
    recipientUserId: v.id("users"),
    // "user" = triggered by another user; "system" = bot/cron-generated
    actorKind: v.union(v.literal("user"), v.literal("system")),
    actorUserId: v.optional(v.id("users")),
    type: v.union(
      // user-actor types
      v.literal("visit_tag"),
      v.literal("visit_tag_accepted"),
      v.literal("visit_tag_declined"),
      v.literal("new_follow"),
      v.literal("trip_invite"),
      v.literal("trip_invite_accepted"),
      v.literal("trip_invite_declined"),
      v.literal("post_like"),
      // system-actor types
      v.literal("show_announced"),
      v.literal("closing_soon"),
    ),
    visitId: v.optional(v.id("visits")),
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
    postId: v.optional(v.id("activityPosts")),
    tripId: v.optional(v.id("trips")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient_createdAt", ["recipientUserId", "createdAt"])
    .index("by_recipient_isRead", ["recipientUserId", "isRead"]),

  activityPosts: defineTable({
    actorUserId: v.id("users"),
    type: v.union(
      v.literal("visit_created"),
      v.literal("challenge_started"),
      v.literal("challenge_milestone"),
      v.literal("challenge_completed")
    ),
    // Absent for challenge_started posts (no associated visit/show).
    visitId: v.optional(v.id("visits")),
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
    visitDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    city: v.optional(v.string()),
    theatre: v.optional(v.string()),
    rankAtPost: v.optional(v.number()),
    taggedUserIds: v.optional(v.array(v.id("users"))),
    // Free-text guest names carried over from the visit for feed display.
    taggedGuestNames: v.optional(v.array(v.string())),
    // Challenge-specific metadata (present on challenge_started / challenge_milestone / challenge_completed).
    challengeYear: v.optional(v.number()),
    challengeTarget: v.optional(v.number()),
    challengeProgress: v.optional(v.number()),
    // Denormalized like count — kept in sync by postLikes mutations so feeds
    // don't have to aggregate on every read.
    likeCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_actor_createdAt", ["actorUserId", "createdAt"]),

  // One row per (post, liker). Insert = liked, delete = unliked.
  // `by_post_user` enables idempotent toggling; `by_post` powers "likers" lists.
  postLikes: defineTable({
    postId: v.id("activityPosts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_user", ["postId", "userId"])
    .index("by_user", ["userId"]),

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
  theatreChallenges: defineTable({
    userId: v.id("users"),
    year: v.number(),
    targetCount: v.number(),
    currentCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_year", ["userId", "year"]),

  userStats: defineTable({
    userId: v.id("users"),
    theatreRank: v.optional(v.number()),
    theatreScore: v.number(),
    currentStreakWeeks: v.number(),
    longestStreakWeeks: v.number(),
    lastActiveWeek: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_theatreScore", ["theatreScore"]),

  tripPresence: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    lastSeenAt: v.number(),
    activeTab: v.optional(
      v.union(
        v.literal("shows"),
        v.literal("schedule"),
        v.literal("party"),
        v.literal("chat")
      )
    ),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_user", ["tripId", "userId"]),

  botActivity: defineTable({
    sourceUrl: v.string(),
    showName: v.string(),
    showType: v.string(),
    district: v.string(),
    confidence: v.number(),
    action: v.union(
      v.literal("show_created"),
      v.literal("production_created"),
      v.literal("production_updated"),
      v.literal("skipped"),
    ),
    summary: v.string(),
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  // Free-form user reports about show/production catalog data (mobile app).
  // Kept separate from reviewQueue, which is field-level ingest/admin workflow.
  catalogUserFeedback: defineTable({
    userId: v.id("users"),
    /** Omitted when the report is about a missing show (no showId to reference). */
    showId: v.optional(v.id("shows")),
    /** Denormalized at submit time for admin list if the show is renamed. */
    showNameSnapshot: v.optional(v.string()),
    productionId: v.optional(v.id("productions")),
    /** e.g. theatre · city, for admin context when production exists. */
    productionLabelSnapshot: v.optional(v.string()),
    note: v.string(),
    /** Where the report was submitted from: "show_detail" | "search" | "add_visit" */
    source: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_show", ["showId"])
    .index("by_user", ["userId"]),

  // User theatre element preferences (importance ratings 1–5 Likert scale).
  userPreferences: defineTable({
    userId: v.id("users"),
    elementRatings: v.array(
      v.object({ element: v.string(), rating: v.number() })
    ),
    notificationSettings: v.optional(v.object({
      follows: v.boolean(),
      visitTags: v.boolean(),
      tripInvites: v.boolean(),
      closingSoon: v.boolean(),
      showAnnounced: v.boolean(),
      postLikes: v.boolean(),
    })),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  aiRecommendationHistory: defineTable({
    userId: v.id("users"),
    showId: v.id("shows"),
    showNameSnapshot: v.string(),
    headline: v.string(),
    reasoning: v.optional(v.string()),
    createdAt: v.number(),
    kind: v.union(
      v.literal("would_i_like"),
      v.literal("find_a_show"),
      v.literal("help_me_decide")
    ),
    // Only set for kind="would_i_like".
    score: v.optional(v.number()),
    matchedElements: v.optional(v.array(v.string())),
    mismatchedElements: v.optional(v.array(v.string())),
    // Only set for multi-pick kinds (find_a_show, help_me_decide).
    rank: v.optional(v.union(v.literal("primary"), v.literal("alternate"))),
    urgency: v.optional(
      v.union(
        v.literal("closing_soon"),
        v.literal("open_run"),
        v.literal("standard")
      )
    ),
    targetDate: v.optional(v.string()),
    // Shared across all picks from a single find_a_show / help_me_decide run
    // so the history UI can group them as one block.
    groupId: v.optional(v.string()),
    // Structured reasoning for multi-pick kinds.
    fit: v.optional(v.string()),
    edge: v.optional(v.string()),
    tradeoff: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_show", ["userId", "showId"]),

  // Per-field review decisions for shows and productions.
  reviewQueue: defineTable({
    entityType: v.union(v.literal("show"), v.literal("production")),
    entityId: v.string(),
    field: v.string(),
    currentValue: v.optional(v.string()),
    source: v.union(
      v.literal("wikipedia"),
      v.literal("ticketmaster"),
      v.literal("bot"),
      v.literal("seed"),
      v.literal("manual"),
      v.literal("wikidata"),
      v.literal("playbill")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("edited")
    ),
    reviewedValue: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_status", ["status"])
    .index("by_entity_field", ["entityType", "entityId", "field"]),
});
