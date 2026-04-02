import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { normalizeShowName, mapExternalTypeToShowType } from "./showNormalization";
import { addShowToAllUsersUncategorizedIfEligible } from "./listRules";
import { getProductionStatus } from "../src/utils/productions";

const NYC_DISTRICTS = new Set(["broadway", "off_broadway", "off_off_broadway"]);

// ─── Validators (mirrors bot/src/parser.ts types) ────────────────────────────

const districtValidator = v.union(
  v.literal("broadway"),
  v.literal("off_broadway"),
  v.literal("off_off_broadway"),
  v.literal("west_end"),
  v.literal("touring"),
  v.literal("regional"),
  v.literal("other"),
);

const productionTypeValidator = v.union(
  v.literal("original"),
  v.literal("revival"),
  v.literal("transfer"),
  v.literal("touring"),
  v.literal("concert"),
  v.literal("workshop"),
  v.literal("other"),
);

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("other"),
);

const parsedProductionValidator = v.object({
  show_name: v.string(),
  show_type: showTypeValidator,
  district: districtValidator,
  production_type: productionTypeValidator,
  theatre: v.union(v.string(), v.null()),
  city: v.union(v.string(), v.null()),
  preview_date: v.union(v.string(), v.null()),
  opening_date: v.union(v.string(), v.null()),
  closing_date: v.union(v.string(), v.null()),
  event_type: v.union(
    v.literal("new_announcement"),
    v.literal("date_change"),
    v.literal("closing_notice"),
    v.literal("casting"),
    v.literal("other"),
  ),
  confidence: v.number(),
  summary: v.string(),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAllUsersWithPushTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.expoPushToken?.startsWith("ExponentPushToken["))
      .map((u) => ({ _id: u._id, expoPushToken: u.expoPushToken! }));
  },
});

// ─── Main ingestion mutation ──────────────────────────────────────────────────

export const ingestProduction = internalMutation({
  args: {
    production: parsedProductionValidator,
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const p = args.production;

    // 1. Resolve or create the show.
    const normalizedName = normalizeShowName(p.show_name);
    const showType = mapExternalTypeToShowType(p.show_type) ?? p.show_type;

    let show = await ctx.db
      .query("shows")
      .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
      .first();

    let isNewShow = false;
    if (!show) {
      const showId = await ctx.db.insert("shows", {
        name: p.show_name.trim(),
        normalizedName,
        type: showType,
        images: [],
        isUserCreated: false,
        externalSource: "bot",
        externalId: normalizedName,
        sourceConfidence: p.confidence,
      });
      show = await ctx.db.get(showId);
      isNewShow = true;
    }

    if (!show) return; // defensive

    // 2. Find an existing production to update, or insert a new one.
    const existingProductions = await ctx.db
      .query("productions")
      .withIndex("by_show", (q) => q.eq("showId", show!._id))
      .collect();

    // Match by district + theatre (normalised). Theatre may be null for touring / announced.
    const normTheatre = p.theatre?.trim().toLowerCase() ?? null;
    const existing = existingProductions.find((prod) => {
      if (prod.district !== p.district) return false;
      if (!normTheatre) return true; // no theatre info — match first in same district
      return prod.theatre?.trim().toLowerCase() === normTheatre;
    });

    const today = new Date().toISOString().split("T")[0];
    let productionId = existing?._id;
    let isNewProduction = false;
    let dateChanged = false;

    if (!existing) {
      productionId = await ctx.db.insert("productions", {
        showId: show._id,
        theatre: p.theatre ?? undefined,
        city: p.city ?? undefined,
        district: p.district,
        previewDate: p.preview_date ?? undefined,
        openingDate: p.opening_date ?? undefined,
        closingDate: p.closing_date ?? undefined,
        productionType: p.production_type,
        isUserCreated: false,
        externalId: args.sourceUrl,
        notes: undefined,
      });
      isNewProduction = true;
    } else {
      // Patch dates if the bot provided new/different values.
      const patch: Record<string, string | undefined> = {};
      if (p.preview_date && p.preview_date !== existing.previewDate) {
        patch.previewDate = p.preview_date;
        dateChanged = true;
      }
      if (p.opening_date && p.opening_date !== existing.openingDate) {
        patch.openingDate = p.opening_date;
        dateChanged = true;
      }
      if (p.closing_date && p.closing_date !== existing.closingDate) {
        patch.closingDate = p.closing_date;
        dateChanged = true;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
    }

    if (!productionId) return; // defensive

    // ── Audit log ──────────────────────────────────────────────────────────
    const activityBase = {
      sourceUrl: args.sourceUrl,
      showName: p.show_name,
      showType: p.show_type,
      district: p.district,
      confidence: p.confidence,
      summary: p.summary,
      showId: show._id,
      productionId,
      createdAt: Date.now(),
    };

    if (isNewShow) {
      await ctx.db.insert("botActivity", {
        ...activityBase,
        action: "show_created" as const,
      });
    }
    if (isNewProduction) {
      await ctx.db.insert("botActivity", {
        ...activityBase,
        action: "production_created" as const,
      });
    } else if (dateChanged) {
      await ctx.db.insert("botActivity", {
        ...activityBase,
        action: "production_updated" as const,
      });
    } else if (!isNewShow && !isNewProduction) {
      await ctx.db.insert("botActivity", {
        ...activityBase,
        action: "skipped" as const,
      });
    }

    // 3. If it's a new, non-closed production: add to all users' uncategorized list.
    const productionForStatus = {
      previewDate: p.preview_date ?? undefined,
      openingDate: p.opening_date ?? undefined,
      closingDate: p.closing_date ?? undefined,
    };
    const status = getProductionStatus(productionForStatus, today);

    if ((isNewProduction || isNewShow) && status !== "closed") {
      await addShowToAllUsersUncategorizedIfEligible(ctx, show._id);
    }

    // 4. Schedule push notification fan-out.
    if (isNewProduction && status !== "closed") {
      await ctx.scheduler.runAfter(0, internal.botIngestion.fanOutShowAnnouncedNotifications, {
        showId: show._id,
        productionId,
        summary: p.summary,
        showName: show.name,
      });
    } else if (dateChanged) {
      await ctx.scheduler.runAfter(0, internal.botIngestion.fanOutDateChangedNotifications, {
        showId: show._id,
        productionId,
        summary: p.summary,
        showName: show.name,
      });
    }

    // 5. Schedule image enrichment for the new show/production.
    const showHasImage = show.images.length > 0 || !!show.hotlinkImageUrl;

    if (NYC_DISTRICTS.has(p.district) && !showHasImage) {
      await ctx.scheduler.runAfter(
        0,
        internal.imageEnrichment.ticketmaster.enrichProductionTicketmaster,
        {
          productionId,
          showId: show._id,
          showName: show.name,
          showHasImage: false,
        }
      );
    }

    if (isNewShow && !showHasImage) {
      await ctx.scheduler.runAfter(
        0,
        internal.imageEnrichment.wikipedia.enrichShowWikipedia,
        {
          showId: show._id,
          showName: show.name,
          showType: show.type,
        }
      );
    }
  },
});

type UserWithToken = { _id: Id<"users">; expoPushToken: string };

// ─── Fan-out: new show announced ─────────────────────────────────────────────

export const fanOutShowAnnouncedNotifications = internalAction({
  args: {
    showId: v.id("shows"),
    productionId: v.id("productions"),
    summary: v.string(),
    showName: v.string(),
  },
  handler: async (ctx, args) => {
    const users = (await ctx.runQuery(
      internal.botIngestion.getAllUsersWithPushTokens,
      {}
    )) as UserWithToken[];

    await Promise.allSettled(
      users.map(async (user) => {
        // Insert a notification row for inbox display.
        await ctx.runMutation(internal.botIngestion.insertSystemNotification, {
          recipientUserId: user._id,
          type: "show_announced",
          showId: args.showId,
          productionId: args.productionId,
        });

        // Send push.
        await ctx.runAction(internal.notifications.sendPushNotification, {
          recipientUserId: user._id,
          title: "New show announced",
          body: args.summary,
          data: {
            type: "show_announced",
            showId: args.showId,
            productionId: args.productionId,
          },
        });
      })
    );
  },
});

// ─── Fan-out: date changed ────────────────────────────────────────────────────

export const fanOutDateChangedNotifications = internalAction({
  args: {
    showId: v.id("shows"),
    productionId: v.id("productions"),
    summary: v.string(),
    showName: v.string(),
  },
  handler: async (ctx, args) => {
    const users = (await ctx.runQuery(
      internal.botIngestion.getAllUsersWithPushTokens,
      {}
    )) as UserWithToken[];

    await Promise.allSettled(
      users.map((user) =>
        ctx.runAction(internal.notifications.sendPushNotification, {
          recipientUserId: user._id,
          title: `${args.showName} — dates updated`,
          body: args.summary,
          data: {
            type: "show_announced",
            showId: args.showId,
            productionId: args.productionId,
          },
        })
      )
    );
  },
});

// ─── Bot activity query (for OpenClaw morning summary) ────────────────────────

export const listBotActivitySince = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("botActivity")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", args.since))
      .collect();
    return rows
      .filter((r) => r.action !== "skipped")
      .map((r) => ({
        showName: r.showName,
        action: r.action,
        confidence: r.confidence,
        summary: r.summary,
        sourceUrl: r.sourceUrl,
        createdAt: r.createdAt,
      }));
  },
});

// ─── Helper: insert system notification row ───────────────────────────────────

export const insertSystemNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    type: v.union(v.literal("show_announced"), v.literal("closing_soon")),
    showId: v.optional(v.id("shows")),
    productionId: v.optional(v.id("productions")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      recipientUserId: args.recipientUserId,
      actorKind: "system",
      type: args.type,
      showId: args.showId,
      productionId: args.productionId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
