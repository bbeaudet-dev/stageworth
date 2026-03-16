import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { getProductionStatus } from "../src/utils/productions";

export const SYSTEM_LIST_KEYS = [
  "want_to_see",
  "look_into",
  "not_interested",
  "uncategorized",
] as const;

export type SystemListKey = (typeof SYSTEM_LIST_KEYS)[number];

export const SYSTEM_LIST_NAME_BY_KEY: Record<SystemListKey, string> = {
  want_to_see: "Want to See",
  look_into: "Look Into",
  not_interested: "Not Interested",
  uncategorized: "Uncategorized",
};

const CLASSIFICATION_KEYS: SystemListKey[] = [
  "want_to_see",
  "look_into",
  "not_interested",
  "uncategorized",
];

type MutationCtx = GenericMutationCtx<DataModel>;

type UserListDoc = DataModel["userLists"]["document"];

function uniqueShowIds(showIds: Id<"shows">[]): Id<"shows">[] {
  const seen = new Set<Id<"shows">>();
  const deduped: Id<"shows">[] = [];
  for (const showId of showIds) {
    if (seen.has(showId)) continue;
    seen.add(showId);
    deduped.push(showId);
  }
  return deduped;
}

async function getSystemListMapForUser(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Map<SystemListKey, UserListDoc>> {
  const listEntries = await Promise.all(
    SYSTEM_LIST_KEYS.map(async (key) => {
      const list = await ctx.db
        .query("userLists")
        .withIndex("by_user_systemKey", (q) =>
          q.eq("userId", userId).eq("systemKey", key)
        )
        .first();
      return list ? ([key, list] as const) : null;
    })
  );

  return new Map(
    listEntries.filter(
      (entry): entry is readonly [SystemListKey, UserListDoc] => entry !== null
    )
  );
}

async function patchListShowIdsIfChanged(
  ctx: MutationCtx,
  list: UserListDoc,
  showIds: Id<"shows">[]
) {
  const next = uniqueShowIds(showIds);
  if (
    list.showIds.length === next.length &&
    list.showIds.every((showId, index) => showId === next[index])
  ) {
    return;
  }

  await ctx.db.patch(list._id, {
    showIds: next,
    updatedAt: Date.now(),
  });
}

export async function getEligibleUncategorizedShowIds(
  ctx: MutationCtx
): Promise<Id<"shows">[]> {
  const productions = await ctx.db.query("productions").collect();
  const today = new Date().toISOString().split("T")[0];
  const showIdSet = new Set<Id<"shows">>();

  for (const production of productions) {
    const status = getProductionStatus(production, today);
    if (status === "closed") continue;
    showIdSet.add(production.showId);
  }

  return Array.from(showIdSet);
}

export async function ensureDefaultSystemLists(
  ctx: MutationCtx,
  userId: Id<"users">,
  uncategorizedSeedShowIds: Id<"shows">[] = []
) {
  const now = Date.now();
  const existing = await getSystemListMapForUser(ctx, userId);

  for (const key of SYSTEM_LIST_KEYS) {
    if (existing.has(key)) continue;
    await ctx.db.insert("userLists", {
      userId,
      name: SYSTEM_LIST_NAME_BY_KEY[key],
      kind: "system",
      systemKey: key,
      description: undefined,
      isPublic: false,
      showIds: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  const allSystemLists = await getSystemListMapForUser(ctx, userId);
  if (uncategorizedSeedShowIds.length === 0) return allSystemLists;

  const uncategorized = allSystemLists.get("uncategorized");
  if (!uncategorized) return allSystemLists;

  const excluded = new Set<Id<"shows">>();
  for (const key of CLASSIFICATION_KEYS) {
    if (key === "uncategorized") continue;
    const list = allSystemLists.get(key);
    if (!list) continue;
    for (const showId of list.showIds) {
      excluded.add(showId);
    }
  }

  const nextShowIds = [...uncategorized.showIds];
  for (const showId of uniqueShowIds(uncategorizedSeedShowIds)) {
    if (excluded.has(showId)) continue;
    if (!nextShowIds.includes(showId)) {
      nextShowIds.push(showId);
    }
  }

  await patchListShowIdsIfChanged(ctx, uncategorized, nextShowIds);
  return await getSystemListMapForUser(ctx, userId);
}

async function addShowToListIfMissing(
  ctx: MutationCtx,
  list: UserListDoc | undefined,
  showId: Id<"shows">
) {
  if (!list) return;
  if (list.showIds.includes(showId)) return;
  await patchListShowIdsIfChanged(ctx, list, [...list.showIds, showId]);
}

async function removeShowFromListIfPresent(
  ctx: MutationCtx,
  list: UserListDoc | undefined,
  showId: Id<"shows">
) {
  if (!list) return;
  if (!list.showIds.includes(showId)) return;
  await patchListShowIdsIfChanged(
    ctx,
    list,
    list.showIds.filter((id) => id !== showId)
  );
}

export async function addShowToSystemListWithRules(
  ctx: MutationCtx,
  userId: Id<"users">,
  targetKey: SystemListKey,
  showId: Id<"shows">
) {
  const lists = await ensureDefaultSystemLists(ctx, userId);
  const target = lists.get(targetKey);
  if (!target) return;

  if (CLASSIFICATION_KEYS.includes(targetKey)) {
    for (const key of CLASSIFICATION_KEYS) {
      if (key === targetKey) continue;
      await removeShowFromListIfPresent(ctx, lists.get(key), showId);
    }
  }

  await addShowToListIfMissing(ctx, target, showId);
}

export async function removeShowFromSystemLists(
  ctx: MutationCtx,
  userId: Id<"users">,
  showId: Id<"shows">,
  keys: SystemListKey[]
) {
  const lists = await ensureDefaultSystemLists(ctx, userId);
  for (const key of keys) {
    await removeShowFromListIfPresent(ctx, lists.get(key), showId);
  }
}

export async function addShowToUserUncategorizedIfEligible(
  ctx: MutationCtx,
  userId: Id<"users">,
  showId: Id<"shows">
) {
  const lists = await ensureDefaultSystemLists(ctx, userId);
  for (const key of CLASSIFICATION_KEYS) {
    const list = lists.get(key);
    if (!list) continue;
    if (list.showIds.includes(showId)) return;
  }
  const uncategorized = lists.get("uncategorized");
  await addShowToListIfMissing(ctx, uncategorized, showId);
}

export async function addShowToAllUsersUncategorizedIfEligible(
  ctx: MutationCtx,
  showId: Id<"shows">
) {
  const users = await ctx.db.query("users").collect();
  for (const user of users) {
    await addShowToUserUncategorizedIfEligible(ctx, user._id, showId);
  }
}
