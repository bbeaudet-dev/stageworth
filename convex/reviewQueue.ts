import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { resolveShowImageUrls, resolveProductionPosterUrl } from "./helpers";
import { normalizeShowName } from "./showNormalization";
import { getProductionStatus } from "../src/utils/productions";

// Fields we track in the review queue for each entity type.
export const SHOW_REVIEWABLE_FIELDS = [
  "name",
  "type",
  "subtype",
  "hotlinkImageUrl",
] as const;

export const PRODUCTION_REVIEWABLE_FIELDS = [
  "theatre",
  "city",
  "district",
  "previewDate",
  "openingDate",
  "closingDate",
  "isOpenRun",
  "isClosed",
  "productionType",
  "hotlinkPosterUrl",
  "runningTime",
  "intermissionCount",
  "intermissionMinutes",
  "description",
] as const;

const dataStatusValidator = v.union(
  v.literal("needs_review"),
  v.literal("partial"),
  v.literal("complete")
);

const reviewDecisionValidator = v.union(
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("edited")
);

const sourceValidator = v.union(
  v.literal("wikipedia"),
  v.literal("ticketmaster"),
  v.literal("bot"),
  v.literal("seed"),
  v.literal("manual"),
  v.literal("wikidata"),
  v.literal("playbill")
);

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("revue"),
  v.literal("comedy"),
  v.literal("magic"),
  v.literal("other")
);

const productionDistrictValidator = v.union(
  v.literal("broadway"),
  v.literal("off_broadway"),
  v.literal("off_off_broadway"),
  v.literal("west_end"),
  v.literal("touring"),
  v.literal("regional"),
  v.literal("other")
);

const productionTypeFormValidator = v.union(
  v.literal("original"),
  v.literal("revival"),
  v.literal("transfer"),
  v.literal("touring"),
  v.literal("concert"),
  v.literal("workshop"),
  v.literal("other")
);

// ─── Queries ──────────────────────────────────────────────────────────────────

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allShows = await ctx.db.query("shows").collect();

    let needsReview = 0;
    let partial = 0;
    let complete = 0;
    for (const s of allShows) {
      const status = s.dataStatus ?? "needs_review";
      if (status === "needs_review") needsReview++;
      else if (status === "partial") partial++;
      else complete++;
    }

    const pendingEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      shows: { needsReview, partial, complete, total: allShows.length },
      pendingQueueEntries: pendingEntries.length,
    };
  },
});

/**
 * Admin schedule filter only (data status is a separate control).
 * Uses production dates vs `asOf` (UTC calendar day, same as `getProductionStatus` default).
 * - current_upcoming: at least one run is not `closed` (previews, open, announced future, open run, etc.).
 * - historical: all runs closed, no productions, or dates missing so status resolves to `closed`.
 */
function scheduleBucketForShow(
  prods: Array<{
    previewDate?: string;
    openingDate?: string;
    closingDate?: string;
    isOpenRun?: boolean | null;
    isClosed?: boolean | null;
  }>,
  asOf: string
): "running" | "upcoming" | "historical" {
  if (prods.length === 0) return "historical";
  // Priority: running > upcoming > historical
  for (const p of prods) {
    const s = getProductionStatus(p, asOf);
    if (s === "open" || s === "open_run" || s === "in_previews") return "running";
  }
  for (const p of prods) {
    if (getProductionStatus(p, asOf) === "announced") return "upcoming";
  }
  return "historical";
}

export const listShowsForReview = query({
  args: {
    statusFilter: v.optional(dataStatusValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    /** When all omitted/true, no schedule filter. When any false, keep only those buckets. */
    includeRunning: v.optional(v.boolean()),
    includeUpcoming: v.optional(v.boolean()),
    includeHistorical: v.optional(v.boolean()),
    /** "name" = alphabetical (default); "recentQueue" = shows with newest queue items first. */
    sortBy: v.optional(v.union(v.literal("name"), v.literal("recentQueue"))),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 5000);
    const offset = Math.max(args.offset ?? 0, 0);
    const asOf = new Date().toISOString().split("T")[0];

    const allProductions = await ctx.db.query("productions").collect();
    const productionIdsByShow = new Map<Id<"shows">, Id<"productions">[]>();
    const prodsByShowId = new Map<
      Id<"shows">,
      (typeof allProductions)[number][]
    >();
    // Reverse map for resolving production entries → showId when sorting by queue.
    const showIdByProductionId = new Map<string, string>();
    for (const p of allProductions) {
      const list = productionIdsByShow.get(p.showId) ?? [];
      list.push(p._id);
      productionIdsByShow.set(p.showId, list);
      const arr = prodsByShowId.get(p.showId) ?? [];
      arr.push(p);
      prodsByShowId.set(p.showId, arr);
      showIdByProductionId.set(p._id as string, p.showId as string);
    }

    let shows = await ctx.db.query("shows").collect();

    if (args.statusFilter) {
      shows = shows.filter((s) => {
        const status = s.dataStatus ?? "needs_review";
        return status === args.statusFilter;
      });
    }

    if (args.search) {
      const needle = args.search.trim().toLowerCase();
      if (needle.length > 0) {
        shows = shows.filter((s) => s.name.toLowerCase().includes(needle));
      }
    }

    const incR = args.includeRunning !== false;
    const incU = args.includeUpcoming !== false;
    const incH = args.includeHistorical !== false;
    if (!(incR && incU && incH)) {
      shows = shows.filter((s) => {
        const prods = prodsByShowId.get(s._id) ?? [];
        const bucket = scheduleBucketForShow(prods, asOf);
        if (bucket === "running") return incR;
        if (bucket === "upcoming") return incU;
        return incH;
      });
    }

    const allEntries = await ctx.db.query("reviewQueue").collect();
    const pendingCountByEntity = new Map<string, number>();
    // For recentQueue sort: track the newest *pending* entry timestamp per show.
    // Only pending entries count — approved/rejected items don't keep a show at the top.
    const latestQueueAtByShow = new Map<string, number>();
    for (const entry of allEntries) {
      const key = `${entry.entityType}:${entry.entityId}`;
      if (entry.status === "pending") {
        pendingCountByEntity.set(key, (pendingCountByEntity.get(key) || 0) + 1);
        const showId =
          entry.entityType === "show"
            ? (entry.entityId as string)
            : (showIdByProductionId.get(entry.entityId as string) ?? null);
        if (showId) {
          const t = entry._creationTime ?? 0;
          if ((latestQueueAtByShow.get(showId) ?? 0) < t) {
            latestQueueAtByShow.set(showId, t);
          }
        }
      }
    }

    const statusOrder = { needs_review: 0, partial: 1, complete: 2 };
    if (args.sortBy === "recentQueue") {
      shows.sort((a, b) => {
        const aT = latestQueueAtByShow.get(a._id as string) ?? 0;
        const bT = latestQueueAtByShow.get(b._id as string) ?? 0;
        // Primary: shows with pending items before shows without
        const aHas = aT > 0 ? 1 : 0;
        const bHas = bT > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        // Secondary: newest pending entry first (matters for fresh Playbill data)
        if (bT !== aT) return bT - aT;
        // Tertiary: alphabetical
        return a.name.localeCompare(b.name);
      });
    } else {
      shows.sort((a, b) => {
        const aOrder = statusOrder[a.dataStatus ?? "needs_review"];
        const bOrder = statusOrder[b.dataStatus ?? "needs_review"];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
    }

    const total = shows.length;
    const pageShows = shows.slice(offset, offset + limit);

    const page = await Promise.all(
      pageShows.map(async (show) => {
        const images = await resolveShowImageUrls(ctx, show);
        const showPending = pendingCountByEntity.get(`show:${show._id}`) ?? 0;
        const prodIds = productionIdsByShow.get(show._id) ?? [];
        let productionPending = 0;
        for (const pid of prodIds) {
          productionPending +=
            pendingCountByEntity.get(`production:${pid}`) ?? 0;
        }

        const prods = prodsByShowId.get(show._id) ?? [];
        return {
          _id: show._id,
          name: show.name,
          type: show.type,
          dataStatus: show.dataStatus ?? "needs_review",
          imageUrl: images[0] ?? null,
          pendingCount: showPending + productionPending,
          productionCount: prodIds.length,
          scheduleBucket: scheduleBucketForShow(prods, asOf),
          latestQueueAt: latestQueueAtByShow.get(show._id as string) ?? null,
        };
      })
    );

    return {
      page,
      total,
      hasMore: offset + page.length < total,
    };
  },
});

/**
 * Property Focus query — show-level fields (flat list, one row per show).
 *
 * Accepts a group of fields (e.g. ["type","subtype"]) so the dashboard can
 * show multiple related columns at once. Each row returns fieldValues and
 * pendingEntries keyed by field name.
 */
export const listShowsForFieldReview = query({
  args: {
    fields: v.array(v.string()),
    statusFilter: v.optional(dataStatusValidator),
    search: v.optional(v.string()),
    includeRunning: v.optional(v.boolean()),
    includeUpcoming: v.optional(v.boolean()),
    includeHistorical: v.optional(v.boolean()),
    /** When true, only return shows that have a pending entry for at least one field. */
    onlyWithPending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const asOf = new Date().toISOString().split("T")[0];
    const fieldSet = new Set(args.fields);

    const allProductions = await ctx.db.query("productions").collect();
    const prodsByShowId = new Map<Id<"shows">, typeof allProductions>();
    for (const p of allProductions) {
      const arr = prodsByShowId.get(p.showId) ?? [];
      arr.push(p);
      prodsByShowId.set(p.showId, arr);
    }

    let shows = await ctx.db.query("shows").collect();

    if (args.statusFilter) {
      shows = shows.filter(
        (s) => (s.dataStatus ?? "needs_review") === args.statusFilter
      );
    }
    if (args.search) {
      const needle = args.search.trim().toLowerCase();
      if (needle.length > 0)
        shows = shows.filter((s) => s.name.toLowerCase().includes(needle));
    }
    const incR = args.includeRunning !== false;
    const incU = args.includeUpcoming !== false;
    const incH = args.includeHistorical !== false;
    if (!(incR && incU && incH)) {
      shows = shows.filter((s) => {
        const bucket = scheduleBucketForShow(prodsByShowId.get(s._id) ?? [], asOf);
        if (bucket === "running") return incR;
        if (bucket === "upcoming") return incU;
        return incH;
      });
    }
    shows.sort((a, b) => a.name.localeCompare(b.name));

    // Fetch all pending entries for these fields at once — avoids N×F round trips.
    type PendingEntry = { _id: string; proposedValue: string; source: string };
    const allPending = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingByEntityField = new Map<string, PendingEntry>();
    for (const entry of allPending) {
      if (entry.entityType !== "show" || !fieldSet.has(entry.field)) continue;
      const key = `${entry.entityId as string}:${entry.field}`;
      if (!pendingByEntityField.has(key)) {
        pendingByEntityField.set(key, {
          _id: entry._id as string,
          proposedValue: entry.currentValue ?? "",
          source: entry.source,
        });
      }
    }

    const rows = await Promise.all(
      shows.map(async (show) => {
        const images = await resolveShowImageUrls(ctx, show);
        const showDoc = show as Record<string, unknown>;
        const fieldValues: Record<string, string | null> = {};
        const pendingEntries: Record<string, PendingEntry | null> = {};
        for (const field of args.fields) {
          const raw = showDoc[field];
          fieldValues[field] = raw !== undefined && raw !== null ? String(raw) : null;
          pendingEntries[field] =
            pendingByEntityField.get(`${show._id as string}:${field}`) ?? null;
        }
        return {
          _id: show._id as string,
          name: show.name,
          dataStatus: show.dataStatus ?? "needs_review",
          imageUrl: images[0] ?? null,
          scheduleBucket: scheduleBucketForShow(prodsByShowId.get(show._id) ?? [], asOf),
          fieldValues,
          pendingEntries,
        };
      })
    );

    if (args.onlyWithPending) {
      return rows.filter((r) => args.fields.some((f) => r.pendingEntries[f] !== null));
    }
    return rows;
  },
});

/**
 * Production Field Focus query — E-layout (one row per production per show).
 *
 * Accepts a group of fields (e.g. ["closingDate","isOpenRun","isClosed"]) and
 * returns shows with nested productions, each carrying fieldValues and
 * pendingEntries keyed by field name.
 */
export const listShowsWithProductionFieldFocus = query({
  args: {
    fields: v.array(v.string()),
    statusFilter: v.optional(dataStatusValidator),
    search: v.optional(v.string()),
    includeRunning: v.optional(v.boolean()),
    includeUpcoming: v.optional(v.boolean()),
    includeHistorical: v.optional(v.boolean()),
    /** When true, only return shows where at least one production has a pending entry. */
    onlyWithPending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const asOf = new Date().toISOString().split("T")[0];
    const fieldSet = new Set(args.fields);

    const allProductions = await ctx.db.query("productions").collect();
    const prodsByShowId = new Map<Id<"shows">, (typeof allProductions)[number][]>();
    for (const p of allProductions) {
      const arr = prodsByShowId.get(p.showId) ?? [];
      arr.push(p);
      prodsByShowId.set(p.showId, arr);
    }

    let shows = await ctx.db.query("shows").collect();

    if (args.statusFilter) {
      shows = shows.filter(
        (s) => (s.dataStatus ?? "needs_review") === args.statusFilter
      );
    }
    if (args.search) {
      const needle = args.search.trim().toLowerCase();
      if (needle.length > 0)
        shows = shows.filter((s) => s.name.toLowerCase().includes(needle));
    }
    const incR = args.includeRunning !== false;
    const incU = args.includeUpcoming !== false;
    const incH = args.includeHistorical !== false;
    if (!(incR && incU && incH)) {
      shows = shows.filter((s) => {
        const bucket = scheduleBucketForShow(prodsByShowId.get(s._id) ?? [], asOf);
        if (bucket === "running") return incR;
        if (bucket === "upcoming") return incU;
        return incH;
      });
    }
    shows.sort((a, b) => a.name.localeCompare(b.name));

    // Fetch all pending production entries for these fields at once.
    type PendingEntry = { _id: string; proposedValue: string; source: string };
    const allPending = await ctx.db
      .query("reviewQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingByEntityField = new Map<string, PendingEntry>();
    for (const entry of allPending) {
      if (entry.entityType !== "production" || !fieldSet.has(entry.field)) continue;
      const key = `${entry.entityId as string}:${entry.field}`;
      if (!pendingByEntityField.has(key)) {
        pendingByEntityField.set(key, {
          _id: entry._id as string,
          proposedValue: entry.currentValue ?? "",
          source: entry.source,
        });
      }
    }

    const rows = await Promise.all(
      shows.map(async (show) => {
        const images = await resolveShowImageUrls(ctx, show);
        const prods = prodsByShowId.get(show._id) ?? [];

        const productionRows = prods.map((prod) => {
          const prodDoc = prod as Record<string, unknown>;
          const fieldValues: Record<string, string | null> = {};
          const pendingEntries: Record<string, PendingEntry | null> = {};
          for (const field of args.fields) {
            const raw = prodDoc[field];
            fieldValues[field] = raw !== undefined && raw !== null ? String(raw) : null;
            pendingEntries[field] =
              pendingByEntityField.get(`${prod._id as string}:${field}`) ?? null;
          }
          const yearPart = prod.openingDate?.slice(0, 4) ?? prod.previewDate?.slice(0, 4) ?? null;
          const label = [prod.district.replace(/_/g, " "), yearPart].filter(Boolean).join(" · ");
          return {
            _id: prod._id as string,
            showId: show._id as string,
            label,
            dataStatus: prod.dataStatus ?? "needs_review",
            fieldValues,
            pendingEntries,
          };
        });

        return {
          _id: show._id as string,
          name: show.name,
          dataStatus: show.dataStatus ?? "needs_review",
          imageUrl: images[0] ?? null,
          scheduleBucket: scheduleBucketForShow(prods, asOf),
          productions: productionRows,
        };
      })
    );

    if (args.onlyWithPending) {
      return rows.filter((r) =>
        r.productions.some((p) =>
          args.fields.some((f) => p.pendingEntries[f] !== null)
        )
      );
    }
    return rows;
  },
});

export const getShowReviewDetail = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;

    const showImages = await resolveShowImageUrls(ctx, show);

    // Get all review queue entries for this show
    const showEntries = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "show").eq("entityId", show._id)
      )
      .collect();

    // Get all productions for this show
    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", show._id))
      .collect();

    const productionsWithDetails = await Promise.all(
      productions.map(async (p) => {
        const posterUrl = await resolveProductionPosterUrl(ctx, p);
        const entries = await ctx.db
          .query("reviewQueue")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", "production").eq("entityId", p._id)
          )
          .collect();

        // Match venues using queued theatre value when pending (doc may be stale).
        const pendingTheatre = entries.find(
          (e) => e.field === "theatre" && e.status === "pending"
        );
        const theatreForMatch =
          pendingTheatre?.currentValue !== undefined
            ? pendingTheatre.currentValue.trim()
            : (p.theatre?.trim() ?? "");

        let venueMatch: { _id: string; name: string; city: string } | null =
          null;
        if (theatreForMatch.length > 0) {
          const normalizedName = normalizeForVenueMatch(theatreForMatch);
          const venue = await ctx.db
            .query("venues")
            .withIndex("by_normalized_name", (q) =>
              q.eq("normalizedName", normalizedName)
            )
            .first();
          if (venue) {
            venueMatch = { _id: venue._id, name: venue.name, city: venue.city };
          }
        }

        return {
          ...p,
          posterUrl,
          dataStatus: p.dataStatus ?? "needs_review",
          reviewEntries: entries,
          venueMatch,
        };
      })
    );

    return {
      show: {
        ...show,
        images: showImages,
        dataStatus: show.dataStatus ?? "needs_review",
      },
      showReviewEntries: showEntries,
      productions: productionsWithDetails,
    };
  },
});

export const listPartialShows = query({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const partialShows = shows.filter(
      (s) => s.dataStatus === "partial"
    );

    return Promise.all(
      partialShows
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (show) => {
          const images = await resolveShowImageUrls(ctx, show);
          const productions = await ctx.db
            .query("productions")
            .withIndex("by_show", (q) => q.eq("showId", show._id))
            .collect();

          const missingFields: string[] = [];
          if (!show.hotlinkImageUrl && show.images.length === 0) {
            missingFields.push("Image");
          }
          if (!show.subtype) missingFields.push("Sub-type");

          const hasProductionImages = productions.some(
            (p) => p.hotlinkPosterUrl || p.posterImage
          );
          if (!hasProductionImages && productions.length > 0) {
            missingFields.push("Production poster(s)");
          }
          if (productions.length === 0) {
            missingFields.push("Productions");
          }

          return {
            _id: show._id,
            name: show.name,
            type: show.type,
            imageUrl: images[0] ?? null,
            productionCount: productions.length,
            missingFields,
          };
        })
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** One-shot upload URL for the admin “missing show” form (image → Convex storage). */
export const generateShowImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Create a new unpublished show, optional key art on `images[]`, and pending queue rows for name, type, and image URL when uploaded. */
export const createShowFromAdminForm = mutation({
  args: {
    name: v.string(),
    type: showTypeValidator,
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeShowName(name);
    if (!normalizedName) {
      throw new Error("Show name is required");
    }

    const existingByNormalizedName = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (existingByNormalizedName) {
      throw new Error("A show with this name already exists");
    }

    const images = args.imageStorageId ? [args.imageStorageId] : [];

    const showId = await ctx.db.insert("shows", {
      name,
      normalizedName,
      type: args.type,
      images,
      isUserCreated: false,
      dataStatus: "needs_review",
    });

    const entityId = showId as string;
    const now = Date.now();

    for (const [field, currentValue] of [
      ["name", name],
      ["type", args.type],
    ] as const) {
      await ctx.db.insert("reviewQueue", {
        entityType: "show",
        entityId,
        field,
        currentValue,
        source: "manual",
        status: "pending",
        createdAt: now,
      });
    }

    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
      if (imageUrl) {
        await ctx.db.insert("reviewQueue", {
          entityType: "show",
          entityId,
          field: "hotlinkImageUrl",
          currentValue: imageUrl,
          source: "manual",
          status: "pending",
          createdAt: now,
        });
      }
    }

    return showId;
  },
});

/**
 * Create a new production for an existing show (admin). `dataStatus` starts as
 * `needs_review`; pending review-queue rows are added for filled fields.
 */
export const createProductionFromAdminForm = mutation({
  args: {
    showId: v.id("shows"),
    theatre: v.string(),
    city: v.optional(v.string()),
    district: productionDistrictValidator,
    previewDate: v.optional(v.string()),
    openingDate: v.optional(v.string()),
    closingDate: v.optional(v.string()),
    isOpenRun: v.optional(v.boolean()),
    isClosed: v.optional(v.boolean()),
    productionType: productionTypeFormValidator,
    notes: v.optional(v.string()),
    ticketmasterEventUrl: v.optional(v.string()),
    posterStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) throw new Error("Show not found");

    const theatre = args.theatre.trim();
    if (!theatre) throw new Error("Theatre is required");

    const city = args.city?.trim() || undefined;
    const previewDate = args.previewDate?.trim() || undefined;
    const openingDate = args.openingDate?.trim() || undefined;
    const closingDate = args.closingDate?.trim() || undefined;
    const notes = args.notes?.trim() || undefined;
    const ticketmasterEventUrl = args.ticketmasterEventUrl?.trim() || undefined;

    const productionId = await ctx.db.insert("productions", {
      showId: args.showId,
      theatre,
      city,
      district: args.district,
      previewDate,
      openingDate,
      closingDate,
      isOpenRun: args.isOpenRun,
      isClosed: args.isClosed,
      productionType: args.productionType,
      notes,
      ticketmasterEventUrl,
      posterImage: args.posterStorageId,
      isUserCreated: false,
      dataStatus: "needs_review",
    });

    const entityId = productionId as string;
    const now = Date.now();

    const queuePairs: [string, string][] = [
      ["theatre", theatre],
      ["city", city ?? ""],
      ["district", args.district],
      ["previewDate", previewDate ?? ""],
      ["openingDate", openingDate ?? ""],
      ["closingDate", closingDate ?? ""],
      ["productionType", args.productionType],
    ];
    if (args.isOpenRun !== undefined) {
      queuePairs.push(["isOpenRun", args.isOpenRun ? "true" : "false"]);
    }
    if (args.isClosed !== undefined) {
      queuePairs.push(["isClosed", args.isClosed ? "true" : "false"]);
    }
    if (notes) queuePairs.push(["notes", notes]);
    if (ticketmasterEventUrl) {
      queuePairs.push(["ticketmasterEventUrl", ticketmasterEventUrl]);
    }

    for (const [field, currentValue] of queuePairs) {
      if (currentValue === "") continue;
      await ctx.db.insert("reviewQueue", {
        entityType: "production",
        entityId,
        field,
        currentValue,
        source: "manual",
        status: "pending",
        createdAt: now,
      });
    }

    if (args.posterStorageId) {
      const posterUrl = await ctx.storage.getUrl(args.posterStorageId);
      if (posterUrl) {
        await ctx.db.insert("reviewQueue", {
          entityType: "production",
          entityId,
          field: "hotlinkPosterUrl",
          currentValue: posterUrl,
          source: "manual",
          status: "pending",
          createdAt: now,
        });
      }
    }

    return productionId;
  },
});

async function deleteReviewQueueEntriesForEntity(
  ctx: MutationCtx,
  entityType: "show" | "production",
  entityId: string
) {
  const entries = await ctx.db
    .query("reviewQueue")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", entityType).eq("entityId", entityId)
    )
    .collect();
  for (const e of entries) {
    await ctx.db.delete(e._id);
  }
}

/** Remove a production from the catalog (admin). Blocked if any visit references it. */
export const deleteProductionAdmin = mutation({
  args: { productionId: v.id("productions") },
  handler: async (ctx, args) => {
    const prod = await ctx.db.get(args.productionId);
    if (!prod) throw new Error("Production not found");

    const visits = await ctx.db
      .query("visits")
      .filter((q) => q.eq(q.field("productionId"), args.productionId))
      .collect();
    if (visits.length > 0) {
      throw new Error(
        `Cannot delete production: ${visits.length} visit(s) reference it. Remove or reassign those visits first.`
      );
    }

    await deleteReviewQueueEntriesForEntity(
      ctx,
      "production",
      args.productionId as string
    );

    if (prod.posterImage) {
      try {
        await ctx.storage.delete(prod.posterImage);
      } catch {
        /* best-effort storage cleanup */
      }
    }

    await ctx.db.delete(args.productionId);
  },
});

/**
 * Remove a show and all its productions from the catalog (admin).
 * Blocked when user-owned data (visits, lists, rankings, etc.) still references the show.
 */
export const deleteShowAdmin = mutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) throw new Error("Show not found");

    const blocks: string[] = [];

    const visitCount = (
      await ctx.db
        .query("visits")
        .filter((q) => q.eq(q.field("showId"), args.showId))
        .collect()
    ).length;
    if (visitCount > 0) blocks.push(`${visitCount} visit(s)`);

    const userShowCount = (
      await ctx.db
        .query("userShows")
        .filter((q) => q.eq(q.field("showId"), args.showId))
        .collect()
    ).length;
    if (userShowCount > 0) {
      blocks.push(`${userShowCount} entr${userShowCount === 1 ? "y" : "ies"} in user libraries`);
    }

    const tripShowCount = (
      await ctx.db
        .query("tripShows")
        .filter((q) => q.eq(q.field("showId"), args.showId))
        .collect()
    ).length;
    if (tripShowCount > 0) {
      blocks.push(`${tripShowCount} trip plan entr${tripShowCount === 1 ? "y" : "ies"}`);
    }

    const lists = await ctx.db.query("userLists").collect();
    const listsContaining = lists.filter((list) =>
      list.showIds.includes(args.showId)
    ).length;
    if (listsContaining > 0) {
      blocks.push(`${listsContaining} custom list(s)`);
    }

    const rankings = await ctx.db.query("userRankings").collect();
    const rankingsContaining = rankings.filter((r) =>
      r.showIds.includes(args.showId)
    ).length;
    if (rankingsContaining > 0) {
      blocks.push(`${rankingsContaining} user ranking list(s)`);
    }

    const postCount = (
      await ctx.db
        .query("activityPosts")
        .filter((q) => q.eq(q.field("showId"), args.showId))
        .collect()
    ).length;
    if (postCount > 0) {
      blocks.push(`${postCount} activity post(s)`);
    }

    const recCount = (
      await ctx.db
        .query("aiRecommendationHistory")
        .filter((q) => q.eq(q.field("showId"), args.showId))
        .collect()
    ).length;
    if (recCount > 0) {
      blocks.push(`${recCount} AI recommendation record(s)`);
    }

    if (blocks.length > 0) {
      throw new Error(
        `Cannot delete show: still referenced by ${blocks.join(", ")}.`
      );
    }

    const productions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();

    for (const p of productions) {
      await deleteReviewQueueEntriesForEntity(ctx, "production", p._id as string);
      if (p.posterImage) {
        try {
          await ctx.storage.delete(p.posterImage);
        } catch {
          /* ignore */
        }
      }
      await ctx.db.delete(p._id);
    }

    await deleteReviewQueueEntriesForEntity(ctx, "show", args.showId as string);

    const feedback = await ctx.db
      .query("catalogUserFeedback")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();
    for (const f of feedback) {
      await ctx.db.delete(f._id);
    }

    const notifs = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("showId"), args.showId))
      .collect();
    for (const n of notifs) {
      await ctx.db.delete(n._id);
    }

    const botRows = await ctx.db
      .query("botActivity")
      .filter((q) => q.eq(q.field("showId"), args.showId))
      .collect();
    for (const b of botRows) {
      await ctx.db.patch(b._id, {
        showId: undefined,
        productionId: undefined,
      });
    }

    for (const storageId of show.images) {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        /* ignore */
      }
    }

    await ctx.db.delete(args.showId);
  },
});

export const submitShowReview = mutation({
  args: {
    showId: v.id("shows"),
    showDataStatus: dataStatusValidator,
    entryDecisions: v.array(
      v.object({
        entryId: v.id("reviewQueue"),
        decision: reviewDecisionValidator,
        reviewedValue: v.optional(v.string()),
        note: v.optional(v.string()),
      })
    ),
    productionStatuses: v.optional(
      v.array(
        v.object({
          productionId: v.id("productions"),
          dataStatus: dataStatusValidator,
        })
      )
    ),
    // Ad-hoc field patches that bypass the review queue (e.g. direct edits /
    // clears on fields that have no pending queue entry).
    directEdits: v.optional(
      v.array(
        v.object({
          entityType: v.union(v.literal("show"), v.literal("production")),
          entityId: v.string(),
          field: v.string(),
          // undefined = clear the field
          newValue: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const decision of args.entryDecisions) {
      const entry = await ctx.db.get(decision.entryId);
      if (!entry) continue;

      await ctx.db.patch(decision.entryId, {
        status: decision.decision,
        reviewedValue: decision.reviewedValue,
        note: decision.note,
        reviewedAt: now,
      });

      if (decision.decision === "approved") {
        // Apply the queued value to the DB. Sources like Wikipedia/Ticketmaster
        // pre-write the value before creating the queue entry, so this is
        // idempotent for them. Sources like Playbill stage the entry only, so
        // this is where the value actually lands in the DB.
        if (entry.currentValue !== undefined) {
          await applyFieldChange(
            ctx,
            entry.entityType,
            entry.entityId,
            entry.field,
            entry.currentValue
          );
        }
      } else if (decision.decision === "rejected") {
        await applyFieldChange(
          ctx,
          entry.entityType,
          entry.entityId,
          entry.field,
          undefined
        );
      } else if (
        decision.decision === "edited" &&
        decision.reviewedValue !== undefined
      ) {
        const rv = decision.reviewedValue;
        if (
          entry.field === "hotlinkImageUrl" &&
          isLikelyConvexStorageId(rv)
        ) {
          await applyFieldChange(
            ctx,
            "show",
            entry.entityId,
            "images",
            rv
          );
        } else if (
          entry.field === "hotlinkPosterUrl" &&
          isLikelyConvexStorageId(rv)
        ) {
          await applyFieldChange(
            ctx,
            "production",
            entry.entityId,
            "posterImage",
            rv
          );
        } else {
          await applyFieldChange(
            ctx,
            entry.entityType,
            entry.entityId,
            entry.field,
            rv
          );
        }
      }
    }

    // Apply direct field edits/clears (no queue entry required).
    if (args.directEdits) {
      for (const edit of args.directEdits) {
        await applyFieldChange(
          ctx,
          edit.entityType,
          edit.entityId,
          edit.field,
          edit.newValue
        );
      }
    }

    // Set dataStatus on the show
    await ctx.db.patch(args.showId, { dataStatus: args.showDataStatus });

    // Set dataStatus on productions
    if (args.productionStatuses) {
      for (const ps of args.productionStatuses) {
        await ctx.db.patch(ps.productionId, { dataStatus: ps.dataStatus });
      }
    }
  },
});

/**
 * Internal mutation for bot/enrichment/backfill to create queue entries.
 * Idempotent: skips if a pending entry already exists for the same entity + field.
 */
/** Resolve a Convex file URL for admin image preview after upload. */
export const storagePreviewUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return (await ctx.storage.getUrl(args.storageId)) ?? null;
  },
});

/** Live admin preview: match a theatre string to the venues catalog (normalized name). */
export const findVenueMatchPreview = query({
  args: { theatreName: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.theatreName.trim();
    if (!trimmed) return null;
    const normalizedName = normalizeForVenueMatch(trimmed);
    const venue = await ctx.db
      .query("venues")
      .withIndex("by_normalized_name", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .first();
    if (!venue) return null;
    return {
      _id: venue._id,
      name: venue.name,
      city: venue.city,
    };
  },
});

export const createEntry = internalMutation({
  args: {
    entityType: v.union(v.literal("show"), v.literal("production")),
    entityId: v.string(),
    field: v.string(),
    currentValue: v.optional(v.string()),
    source: sourceValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reviewQueue")
      .withIndex("by_entity_field", (q) =>
        q
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
          .eq("field", args.field)
      )
      .collect();

    const hasPending = existing.some((e) => e.status === "pending");
    if (hasPending) return null;

    return await ctx.db.insert("reviewQueue", {
      entityType: args.entityType,
      entityId: args.entityId,
      field: args.field,
      currentValue: args.currentValue,
      source: args.source,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// ─── Post-closing grace → review queue (cron) ─────────────────────────────────

function addCalendarDaysUtc(isoDate: string, days: number): string {
  const dt = new Date(isoDate + "T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

function subtractCalendarDaysUtc(isoDate: string, days: number): string {
  const dt = new Date(isoDate + "T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().split("T")[0];
}

/** Calendar days after `closingDate` before staging `isClosed: true` for review. */
const POST_CLOSING_IS_CLOSED_GRACE_DAYS = 7;

/**
 * Stage a single production field suggestion (source `bot`) if there is no
 * pending row and no approved/edited row that already accepted this value.
 */
async function stageProductionFieldSuggestion(
  ctx: MutationCtx,
  productionId: Id<"productions">,
  field: string,
  proposedValue: string
): Promise<"created" | "skipped"> {
  const entityId = productionId as string;
  const existing = await ctx.db
    .query("reviewQueue")
    .withIndex("by_entity_field", (q) =>
      q
        .eq("entityType", "production")
        .eq("entityId", entityId)
        .eq("field", field)
    )
    .collect();

  if (existing.some((e) => e.status === "pending")) return "skipped";

  const alreadyAccepted = existing.some((e) => {
    if (e.status !== "approved" && e.status !== "edited") return false;
    const accepted = e.reviewedValue ?? e.currentValue;
    return accepted === proposedValue;
  });
  if (alreadyAccepted) return "skipped";

  await ctx.db.insert("reviewQueue", {
    entityType: "production",
    entityId,
    field,
    currentValue: proposedValue,
    source: "bot",
    status: "pending",
    createdAt: Date.now(),
  });
  return "created";
}

/**
 * After closing date + grace period, stage `isClosed: true` on the review queue
 * for admin approval (does not patch the production directly).
 *
 * - Does not skip when `isClosed === false` (still proposes true for review).
 * - If `isOpenRun === true` but a closing date exists, also stages `isOpenRun: false`
 *   so the run abides by the closing date once approved.
 * - Skips productions that already have `isClosed === true` on the document.
 */
export const stagePostClosingGraceSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const asOf = new Date().toISOString().split("T")[0];
    const indexUpperBound = subtractCalendarDaysUtc(
      asOf,
      POST_CLOSING_IS_CLOSED_GRACE_DAYS
    );

    const candidates = await ctx.db
      .query("productions")
      .withIndex("by_closing_date", (q) => q.lt("closingDate", indexUpperBound))
      .collect();

    let createdIsClosed = 0;
    let createdIsOpenRun = 0;
    let skippedDocAlreadyClosed = 0;
    let skippedStillInGrace = 0;
    let noopIsClosed = 0;
    let noopIsOpenRun = 0;

    for (const p of candidates) {
      if (!p.closingDate) continue;

      const graceEnd = addCalendarDaysUtc(
        p.closingDate,
        POST_CLOSING_IS_CLOSED_GRACE_DAYS
      );
      if (asOf <= graceEnd) {
        skippedStillInGrace++;
        continue;
      }

      if (p.isClosed === true) {
        skippedDocAlreadyClosed++;
        continue;
      }

      const openRunContradictsClosing =
        p.isOpenRun === true && p.closingDate !== undefined;

      if (
        (await stageProductionFieldSuggestion(ctx, p._id, "isClosed", "true")) ===
        "created"
      ) {
        createdIsClosed++;
      } else {
        noopIsClosed++;
      }

      if (openRunContradictsClosing) {
        if (
          (await stageProductionFieldSuggestion(
            ctx,
            p._id,
            "isOpenRun",
            "false"
          )) === "created"
        ) {
          createdIsOpenRun++;
        } else {
          noopIsOpenRun++;
        }
      }
    }

    return {
      asOf,
      graceDays: POST_CLOSING_IS_CLOSED_GRACE_DAYS,
      candidatesScanned: candidates.length,
      createdIsClosed,
      createdIsOpenRun,
      skippedDocAlreadyClosed,
      skippedStillInGrace,
      noopIsClosed,
      noopIsOpenRun,
    };
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Same normalization used by the venues seeder — kept in sync manually. */
function normalizeForVenueMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Fields stored as booleans — string values "true"/"false" must be converted.
const BOOLEAN_FIELDS = new Set(["isOpenRun", "isClosed"]);

// Fields stored as numbers — string values must be parsed before writing to DB.
const NUMERIC_FIELDS = new Set(["runningTime", "intermissionCount", "intermissionMinutes"]);

/** Heuristic: uploaded admin image edits pass a storage id, not a http(s) URL. */
function isLikelyConvexStorageId(s: string): boolean {
  if (s.length < 20 || s.length > 64) return false;
  if (s.includes("://") || s.includes("/") || s.includes(" ")) return false;
  return /^[a-z0-9_-]+$/i.test(s);
}

async function applyFieldChange(
  ctx: any,
  entityType: string,
  entityId: string,
  field: string,
  value: string | undefined
) {
  const doc = await ctx.db.get(entityId as any);
  if (!doc) return;

  if (value === undefined) {
    if (field === "hotlinkImageUrl") {
      await ctx.db.patch(entityId as any, {
        hotlinkImageUrl: undefined,
        hotlinkImageSource: undefined,
      });
    } else if (field === "images") {
      await ctx.db.patch(entityId as any, {
        images: [],
        hotlinkImageUrl: undefined,
        hotlinkImageSource: undefined,
      });
    } else if (field === "posterImage") {
      await ctx.db.patch(entityId as any, {
        posterImage: undefined,
        hotlinkPosterUrl: undefined,
      });
    } else {
      await ctx.db.patch(entityId as any, { [field]: undefined });
    }
  } else if (field === "images") {
    await ctx.db.patch(entityId as any, {
      images: [value],
      hotlinkImageUrl: undefined,
      hotlinkImageSource: undefined,
    });
  } else if (field === "posterImage") {
    await ctx.db.patch(entityId as any, {
      posterImage: value,
      hotlinkPosterUrl: undefined,
    });
  } else if (BOOLEAN_FIELDS.has(field)) {
    const boolValue =
      value === "true" ? true : value === "false" ? false : undefined;
    await ctx.db.patch(entityId as any, { [field]: boolValue });
  } else if (NUMERIC_FIELDS.has(field)) {
    const numValue = Number(value);
    await ctx.db.patch(entityId as any, {
      [field]: isNaN(numValue) ? undefined : numValue,
    });
  } else {
    await ctx.db.patch(entityId as any, { [field]: value });
  }
}
