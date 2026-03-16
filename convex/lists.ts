import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConvexUserId } from "./auth";
import { resolveImageUrls } from "./helpers";
import {
  SYSTEM_LIST_KEYS,
  SYSTEM_LIST_NAME_BY_KEY,
  addShowToSystemListWithRules,
  ensureDefaultSystemLists,
} from "./listRules";

const MAX_CUSTOM_LIST_NAME_LENGTH = 80;
const MAX_CUSTOM_LIST_DESCRIPTION_LENGTH = 280;

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeNameKey(name: string) {
  return normalizeName(name).toLowerCase();
}

async function getOwnedListOrThrow(ctx: any, userId: any, listId: any) {
  const list = await ctx.db.get(listId);
  if (!list) throw new Error("List not found");
  if (list.userId !== userId) throw new Error("Not authorized");
  return list;
}

async function assertNoDuplicateListName(
  ctx: any,
  userId: any,
  rawName: string,
  excludeListId?: string
) {
  const targetKey = normalizeNameKey(rawName);
  const lists = await ctx.db
    .query("userLists")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const hasConflict = lists.some(
    (list: any) =>
      list._id !== excludeListId &&
      normalizeNameKey(list.name) === targetKey
  );
  if (hasConflict) throw new Error("A list with that name already exists");
}

async function resolveShowsByIds(ctx: any, showIds: string[]) {
  const rows = await Promise.all(
    showIds.map(async (showId) => {
      const show = await ctx.db.get(showId);
      if (!show) return null;
      return {
        ...show,
        images: await resolveImageUrls(ctx, show.images),
      };
    })
  );

  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
}

export const getProfileLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);

    const allLists = await ctx.db
      .query("userLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const systemOrder = new Map(SYSTEM_LIST_KEYS.map((key, idx) => [key, idx]));
    const systemLists = allLists
      .filter((list) => list.kind === "system" && list.systemKey !== undefined)
      .sort(
        (a, b) =>
          (systemOrder.get(a.systemKey!) ?? Number.MAX_SAFE_INTEGER) -
          (systemOrder.get(b.systemKey!) ?? Number.MAX_SAFE_INTEGER)
      )
      .map((list) => ({
        _id: list._id,
        name: list.name,
        systemKey: list.systemKey,
        isPublic: list.isPublic,
        showCount: list.showIds.length,
      }));

    const customLists = allLists
      .filter((list) => list.kind === "custom")
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((list) => ({
        _id: list._id,
        name: list.name,
        description: list.description,
        isPublic: list.isPublic,
        showCount: list.showIds.length,
      }));

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const latestVisitDateByShow = new Map<string, string>();
    for (const visit of visits) {
      const existing = latestVisitDateByShow.get(visit.showId);
      if (!existing || visit.date > existing) {
        latestVisitDateByShow.set(visit.showId, visit.date);
      }
    }

    const seenShowIds = Array.from(latestVisitDateByShow.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([showId]) => showId);

    return {
      systemLists,
      customLists,
      seen: {
        name: "Seen",
        showCount: seenShowIds.length,
      },
    };
  },
});

export const getSeenDerivedList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const latestVisitDateByShow = new Map<string, string>();
    for (const visit of visits) {
      const existing = latestVisitDateByShow.get(visit.showId);
      if (!existing || visit.date > existing) {
        latestVisitDateByShow.set(visit.showId, visit.date);
      }
    }

    const showIds = Array.from(latestVisitDateByShow.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([showId]) => showId);

    const shows = await resolveShowsByIds(ctx, showIds);
    return {
      name: "Seen",
      showIds,
      shows,
      isPublic: false,
    };
  },
});

export const getListById = query({
  args: { listId: v.id("userLists") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    const shows = await resolveShowsByIds(ctx, list.showIds);
    return {
      ...list,
      shows,
    };
  },
});

export const createCustomList = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const name = normalizeName(args.name);
    if (!name) throw new Error("List name is required");
    if (name.length > MAX_CUSTOM_LIST_NAME_LENGTH) {
      throw new Error("List name is too long");
    }

    const description = args.description?.trim();
    if (description && description.length > MAX_CUSTOM_LIST_DESCRIPTION_LENGTH) {
      throw new Error("Description is too long");
    }

    await assertNoDuplicateListName(ctx, userId, name);
    const now = Date.now();
    return await ctx.db.insert("userLists", {
      userId,
      name,
      kind: "custom",
      systemKey: undefined,
      description: description || undefined,
      isPublic: args.isPublic ?? false,
      showIds: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const renameCustomList = mutation({
  args: {
    listId: v.id("userLists"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    if (list.kind !== "custom") throw new Error("Only custom lists can be renamed");

    const name = normalizeName(args.name);
    if (!name) throw new Error("List name is required");
    if (name.length > MAX_CUSTOM_LIST_NAME_LENGTH) {
      throw new Error("List name is too long");
    }

    await assertNoDuplicateListName(ctx, userId, name, args.listId);
    await ctx.db.patch(args.listId, {
      name,
      updatedAt: Date.now(),
    });
  },
});

export const updateCustomListDescription = mutation({
  args: {
    listId: v.id("userLists"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    if (list.kind !== "custom") {
      throw new Error("Only custom lists can be updated");
    }

    const description = args.description?.trim();
    if (description && description.length > MAX_CUSTOM_LIST_DESCRIPTION_LENGTH) {
      throw new Error("Description is too long");
    }

    await ctx.db.patch(args.listId, {
      description: description || undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCustomList = mutation({
  args: {
    listId: v.id("userLists"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    if (list.kind !== "custom") throw new Error("Only custom lists can be deleted");
    await ctx.db.delete(args.listId);
  },
});

export const setListVisibility = mutation({
  args: {
    listId: v.id("userLists"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await getOwnedListOrThrow(ctx, userId, args.listId);
    await ctx.db.patch(args.listId, {
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    });
  },
});

export const addShowToList = mutation({
  args: {
    listId: v.id("userLists"),
    showId: v.id("shows"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    await ensureDefaultSystemLists(ctx, userId);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);

    if (list.kind === "system") {
      if (!list.systemKey) throw new Error("System list is missing system key");
      if (!SYSTEM_LIST_KEYS.includes(list.systemKey)) {
        throw new Error("Unsupported system list key");
      }
      await addShowToSystemListWithRules(ctx, userId, list.systemKey, args.showId);
      return;
    }

    if (list.showIds.includes(args.showId)) return;
    await ctx.db.patch(list._id, {
      showIds: [...list.showIds, args.showId],
      updatedAt: Date.now(),
    });
  },
});

export const removeShowFromList = mutation({
  args: {
    listId: v.id("userLists"),
    showId: v.id("shows"),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    if (!list.showIds.includes(args.showId)) return;
    await ctx.db.patch(list._id, {
      showIds: list.showIds.filter(
        (showId: (typeof list.showIds)[number]) => showId !== args.showId
      ),
      updatedAt: Date.now(),
    });
  },
});

export const reorderList = mutation({
  args: {
    listId: v.id("userLists"),
    showId: v.id("shows"),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const list = await getOwnedListOrThrow(ctx, userId, args.listId);
    if (list.kind === "system" && list.systemKey) {
      if (!SYSTEM_LIST_KEYS.includes(list.systemKey)) {
        throw new Error("Unsupported system list key");
      }
    }

    const currentIndex = list.showIds.indexOf(args.showId);
    if (currentIndex === -1) throw new Error("Show is not in this list");

    const nextShowIds = [...list.showIds];
    nextShowIds.splice(currentIndex, 1);
    const clampedPosition = Math.max(0, Math.min(args.newPosition, nextShowIds.length));
    nextShowIds.splice(clampedPosition, 0, args.showId);

    await ctx.db.patch(list._id, {
      showIds: nextShowIds,
      updatedAt: Date.now(),
    });
  },
});

export const initializeSystemLists = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    await ensureDefaultSystemLists(ctx, userId);
    return SYSTEM_LIST_KEYS.map((key) => ({
      key,
      name: SYSTEM_LIST_NAME_BY_KEY[key],
    }));
  },
});
