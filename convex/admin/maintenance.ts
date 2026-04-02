import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { normalizeShowName } from "../showNormalization";

// ─── One-time: clear curated playbill-banner images from all shows ───────────
export const clearShowStorageImages = internalMutation({
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    let cleared = 0;
    for (const show of shows) {
      if (show.images.length === 0) continue;
      for (const storageId of show.images) {
        await ctx.storage.delete(storageId);
      }
      await ctx.db.patch(show._id, { images: [] });
      cleared++;
    }
    return { cleared, total: shows.length };
  },
});

// ─── One-time: restore TM images for shows that have no other image ──────────
// Copies hotlinkPosterUrl from TM-enriched productions to their parent show
// when the show has no hotlinkImageUrl at all.
export const restoreTmFallbackImages = internalMutation({
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    let restored = 0;
    for (const show of shows) {
      if (show.hotlinkImageUrl) continue;
      const productions = await ctx.db
        .query("productions")
        .withIndex("by_show", (q) => q.eq("showId", show._id))
        .collect();
      const tmProd = productions.find((p) => p.hotlinkPosterUrl);
      if (tmProd) {
        await ctx.db.patch(show._id, {
          hotlinkImageUrl: tmProd.hotlinkPosterUrl,
          hotlinkImageSource: "ticketmaster" as const,
        });
        restored++;
      }
    }
    return { restored };
  },
});

// Cleanup synthetic theatre labels from early Wikipedia imports.
// Run: npx convex run admin/maintenance:cleanupSyntheticWikipediaProductions
export const cleanupSyntheticWikipediaProductions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const syntheticLabels = [
      "Wikipedia production",
      "Broadway",
      "Off-Broadway",
      "West End",
      "Tour",
    ];

    const all = await ctx.db.query("productions").collect();
    const toDelete = all.filter((p: any) => {
      if (p.isUserCreated) return false;
      if (!p.theatre) return false;
      if (!syntheticLabels.includes(p.theatre)) return false;
      // Heuristic: our synthetic imports used whole-year dates when present.
      const isSyntheticDate = (d?: string) =>
        !d || /^\d{4}-0?1-0?1$/.test(d) || /^\d{4}-1?2-3?1$/.test(d);
      return isSyntheticDate(p.previewDate) && isSyntheticDate(p.openingDate);
    });

    for (const p of toDelete) {
      await ctx.db.delete(p._id);
    }

    return { removed: toDelete.length, total: all.length };
  },
});
function dedupeShowIdList(ids: Id<"shows">[]): Id<"shows">[] {
  const seen = new Set<string>();
  const out: Id<"shows">[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function getShowByName(ctx: any, name: string) {
  return ctx.db
    .query("shows")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .first();
}

async function mergeShowIntoCanonical(
  ctx: any,
  sourceShowId: Id<"shows">,
  targetShowId: Id<"shows">
) {
  // productions.showId
  const sourceProductions = await ctx.db
    .query("productions")
    .withIndex("by_show", (q: any) => q.eq("showId", sourceShowId))
    .collect();
  for (const production of sourceProductions) {
    const existingTargetProduction = await ctx.db
      .query("productions")
      .withIndex("by_show", (q: any) => q.eq("showId", targetShowId))
      .filter((q: any) => q.eq(q.field("theatre"), production.theatre))
      .first();
    if (existingTargetProduction) {
      await ctx.db.delete(production._id);
    } else {
      await ctx.db.patch(production._id, { showId: targetShowId });
    }
  }

  // visits.showId
  const visits = await ctx.db.query("visits").collect();
  for (const visit of visits) {
    if (visit.showId === sourceShowId) {
      await ctx.db.patch(visit._id, { showId: targetShowId });
    }
  }

  // userShows.showId
  const sourceUserShows = await ctx.db
    .query("userShows")
    .collect();
  for (const userShow of sourceUserShows) {
    if (userShow.showId !== sourceShowId) continue;
    const targetUserShow = await ctx.db
      .query("userShows")
      .withIndex("by_user_show", (q: any) =>
        q.eq("userId", userShow.userId).eq("showId", targetShowId)
      )
      .first();
    if (targetUserShow) {
      await ctx.db.delete(userShow._id);
    } else {
      await ctx.db.patch(userShow._id, { showId: targetShowId });
    }
  }

  // userRankings.showIds
  const rankings = await ctx.db.query("userRankings").collect();
  for (const ranking of rankings) {
    if (!ranking.showIds.includes(sourceShowId)) continue;
    const remapped = ranking.showIds.map((id: Id<"shows">) =>
      id === sourceShowId ? targetShowId : id
    );
    await ctx.db.patch(ranking._id, { showIds: dedupeShowIdList(remapped) });
  }

  // userLists.showIds
  const lists = await ctx.db.query("userLists").collect();
  for (const list of lists) {
    if (!list.showIds.includes(sourceShowId)) continue;
    const remapped = list.showIds.map((id: Id<"shows">) =>
      id === sourceShowId ? targetShowId : id
    );
    await ctx.db.patch(list._id, { showIds: dedupeShowIdList(remapped) });
  }

  // activityPosts.showId
  const activityPosts = await ctx.db.query("activityPosts").collect();
  for (const post of activityPosts) {
    if (post.showId === sourceShowId) {
      await ctx.db.patch(post._id, { showId: targetShowId });
    }
  }

  await ctx.db.delete(sourceShowId);
}

async function hasShowReferences(ctx: any, showId: Id<"shows">) {
  const [productions, visits, userShows, rankings, lists, posts] = await Promise.all([
    ctx.db
      .query("productions")
      .withIndex("by_show", (q: any) => q.eq("showId", showId))
      .first(),
    ctx.db.query("visits").collect(),
    ctx.db.query("userShows").collect(),
    ctx.db.query("userRankings").collect(),
    ctx.db.query("userLists").collect(),
    ctx.db.query("activityPosts").collect(),
  ]);

  if (productions) return true;
  if (visits.some((v: any) => v.showId === showId)) return true;
  if (userShows.some((u: any) => u.showId === showId)) return true;
  if (rankings.some((r: any) => r.showIds.includes(showId))) return true;
  if (lists.some((l: any) => l.showIds.includes(showId))) return true;
  if (posts.some((p: any) => p.showId === showId)) return true;
  return false;
}

// Cleanup helper for imported catalog noise and known title merges.
// Run:
// npx convex run admin/maintenance:cleanupShowCatalog '{"canonicalName":"SIX: The Musical","aliasNames":["Six"],"removeNames":["balugrastim"]}'
export const cleanupShowCatalog = internalMutation({
  args: {
    canonicalName: v.string(),
    aliasNames: v.array(v.string()),
    removeNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const merged: string[] = [];
    const removed: string[] = [];
    const skipped: string[] = [];

    const canonical = await getShowByName(ctx, args.canonicalName);
    if (!canonical) {
      throw new Error(`Canonical show not found: ${args.canonicalName}`);
    }

    for (const aliasName of args.aliasNames) {
      const alias = await getShowByName(ctx, aliasName);
      if (!alias) {
        skipped.push(`${aliasName} (not found)`);
        continue;
      }
      if (alias._id === canonical._id) {
        skipped.push(`${aliasName} (same as canonical)`);
        continue;
      }
      await mergeShowIntoCanonical(ctx, alias._id, canonical._id);
      merged.push(aliasName);
    }

    for (const name of args.removeNames) {
      const show = await getShowByName(ctx, name);
      if (!show) {
        skipped.push(`${name} (not found)`);
        continue;
      }
      const referenced = await hasShowReferences(ctx, show._id);
      if (referenced) {
        skipped.push(`${name} (has references)`);
        continue;
      }
      await ctx.db.delete(show._id);
      removed.push(name);
    }

    return { canonical: canonical.name, merged, removed, skipped };
  },
});

// Remove duplicate show rows when a Wikidata-backed canonical exists for the same normalizedName.
// Keeps one Wikidata-backed row per normalizedName and deletes non-Wikidata duplicates
// that have no references anywhere else in the system.
// Run: npx convex run admin/maintenance:cleanupNonWikidataDuplicateShows
export const cleanupNonWikidataDuplicateShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();

    const byNormalized = new Map<
      string,
      Array<{ _id: Id<"shows">; name: string; externalSource?: string | null }>
    >();
    for (const s of shows) {
      const key = s.normalizedName;
      if (!byNormalized.has(key)) byNormalized.set(key, []);
      byNormalized.get(key)!.push({
        _id: s._id,
        name: s.name,
        externalSource: s.externalSource,
      });
    }

    const removed: string[] = [];
    const kept: string[] = [];
    const skipped: string[] = [];

    for (const [norm, group] of byNormalized.entries()) {
      if (group.length <= 1) continue;

      const wikidataRows = group.filter((g) => g.externalSource === "wikidata");
      if (wikidataRows.length === 0) continue;

      // Prefer the first Wikidata-backed row as canonical.
      const canonical = wikidataRows[0];
      kept.push(`${canonical.name} [${norm}]`);

      for (const row of group) {
        if (row._id === canonical._id) continue;
        const referenced = await hasShowReferences(ctx, row._id);
        if (referenced) {
          skipped.push(`${row.name} (has references)`);
          continue;
        }
        await ctx.db.delete(row._id);
        removed.push(row.name);
      }
    }

    return {
      totalShows: shows.length,
      groupsWithDuplicates: Array.from(byNormalized.values()).filter(
        (g) => g.length > 1
      ).length,
      kept,
      removed,
      skipped,
    };
  },
});

// Hard wipe of all shows that do NOT have externalSource === "wikidata",
// along with their dependent data (productions, visits, userShows, rankings,
// lists, activityPosts). This is destructive and will break references;
// only run when you're explicitly rebuilding from Wikidata.
// Run: npx convex run admin/maintenance:wipeNonWikidataShows
export const wipeNonWikidataShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const keep: string[] = [];
    const removed: string[] = [];

    for (const show of shows) {
      if (show.externalSource === "wikidata") {
        keep.push(show.name);
        continue;
      }

      const showId = show._id as Id<"shows">;

      // productions
      const prods = await ctx.db
        .query("productions")
        .withIndex("by_show", (q: any) => q.eq("showId", showId))
        .collect();
      for (const p of prods) {
        await ctx.db.delete(p._id);
      }

      // visits
      const visits = await ctx.db.query("visits").collect();
      for (const v of visits) {
        if (v.showId === showId) {
          await ctx.db.delete(v._id);
        }
      }

      // userShows
      const userShows = await ctx.db.query("userShows").collect();
      for (const us of userShows) {
        if (us.showId === showId) {
          await ctx.db.delete(us._id);
        }
      }

      // userRankings.showIds
      const rankings = await ctx.db.query("userRankings").collect();
      for (const ranking of rankings) {
        if (!ranking.showIds.includes(showId)) continue;
        const filtered = ranking.showIds.filter((id: Id<"shows">) => id !== showId);
        await ctx.db.patch(ranking._id, { showIds: dedupeShowIdList(filtered) });
      }

      // userLists.showIds
      const lists = await ctx.db.query("userLists").collect();
      for (const list of lists) {
        if (!list.showIds.includes(showId)) continue;
        const filtered = list.showIds.filter((id: Id<"shows">) => id !== showId);
        await ctx.db.patch(list._id, { showIds: dedupeShowIdList(filtered) });
      }

      // activityPosts
      const posts = await ctx.db.query("activityPosts").collect();
      for (const post of posts) {
        if (post.showId === showId) {
          await ctx.db.delete(post._id);
        }
      }

      await ctx.db.delete(showId);
      removed.push(show.name);
    }

    return {
      keptCount: keep.length,
      removedCount: removed.length,
      keptSample: keep.slice(0, 20),
      removedSample: removed.slice(0, 20),
    };
  },
});
function stripGenericTypeTag(name: string): string {
  return name
    .replace(/\s*\((musical|play|opera|operetta|revue|film)\)\s*$/i, "")
    .trim();
}

interface CleanupDecision {
  showId: Id<"shows">;
  oldName: string;
  newName: string;
  type: string;
  action: "rename" | "keep_disambiguated";
}

function buildShowTitleCleanupDecisions(shows: any[]) {
  const byId = new Map<string, any>(shows.map((s) => [s._id, s]));
  const strippedById = new Map<string, string>();
  for (const show of shows) {
    strippedById.set(show._id, stripGenericTypeTag(show.name));
  }

  const strippedNameToTypes = new Map<string, Set<string>>();
  for (const show of shows) {
    const stripped = strippedById.get(show._id)!;
    if (!strippedNameToTypes.has(stripped)) {
      strippedNameToTypes.set(stripped, new Set<string>());
    }
    strippedNameToTypes.get(stripped)!.add(show.type);
  }

  const decisions: CleanupDecision[] = [];
  for (const show of shows) {
    const stripped = strippedById.get(show._id)!;
    if (stripped === show.name) continue;
    const typeSet = strippedNameToTypes.get(stripped) ?? new Set([show.type]);
    const hasCrossTypeCollision = typeSet.size > 1;
    if (hasCrossTypeCollision) {
      decisions.push({
        showId: show._id,
        oldName: show.name,
        newName: show.name,
        type: show.type,
        action: "keep_disambiguated",
      });
    } else {
      decisions.push({
        showId: show._id,
        oldName: show.name,
        newName: stripped,
        type: show.type,
        action: "rename",
      });
    }
  }

  const decisionById = new Map<string, CleanupDecision>();
  for (const d of decisions) {
    decisionById.set(d.showId, d);
  }

  const finalNameById = new Map<string, string>();
  for (const show of shows) {
    const decision = decisionById.get(show._id);
    finalNameById.set(show._id, decision ? decision.newName : show.name);
  }

  const mergeGroups = new Map<string, any[]>();
  for (const show of shows) {
    const finalName = finalNameById.get(show._id)!;
    const key = `${show.type}::${finalName.toLowerCase()}`;
    if (!mergeGroups.has(key)) mergeGroups.set(key, []);
    mergeGroups.get(key)!.push(show);
  }

  const mergePlans: Array<{
    canonicalShowId: Id<"shows">;
    canonicalName: string;
    sourceShowIds: Id<"shows">[];
    sourceNames: string[];
    type: string;
  }> = [];

  for (const group of mergeGroups.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => a._creationTime - b._creationTime);
    const canonical = sorted[0];
    const sources = sorted.slice(1);
    mergePlans.push({
      canonicalShowId: canonical._id,
      canonicalName: finalNameById.get(canonical._id)!,
      sourceShowIds: sources.map((s) => s._id),
      sourceNames: sources.map((s) => s.name),
      type: canonical.type,
    });
  }

  return {
    decisions,
    mergePlans,
    finalNameById,
    byId,
  };
}

// Dry-run cleanup preview for generic "(musical)/(play)/(opera)/(revue)" suffixes.
// Run: npx convex run admin/maintenance:previewShowTitleCleanup
export const previewShowTitleCleanup = internalQuery({
  args: {
    sampleLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shows = await ctx.db.query("shows").collect();
    const { decisions, mergePlans } = buildShowTitleCleanupDecisions(shows);

    const renameDecisions = decisions.filter((d) => d.action === "rename");
    const keepDisambiguated = decisions.filter(
      (d) => d.action === "keep_disambiguated"
    );
    const sampleLimit = args.sampleLimit ?? 30;

    return {
      totalShows: shows.length,
      decisionsTotal: decisions.length,
      renameCount: renameDecisions.length,
      keepDisambiguatedCount: keepDisambiguated.length,
      mergeGroupCount: mergePlans.length,
      mergeSourceCount: mergePlans.reduce(
        (acc, group) => acc + group.sourceShowIds.length,
        0
      ),
      renameSamples: renameDecisions.slice(0, sampleLimit),
      keepDisambiguatedSamples: keepDisambiguated.slice(0, sampleLimit),
      mergeSamples: mergePlans.slice(0, sampleLimit),
    };
  },
});

// Apply cleanup/merge for generic "(musical)/(play)/(opera)/(revue)" suffixes.
// Run: npx convex run admin/maintenance:applyShowTitleCleanup
export const applyShowTitleCleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db.query("shows").collect();
    const { decisions, mergePlans, finalNameById, byId } =
      buildShowTitleCleanupDecisions(shows);

    for (const plan of mergePlans) {
      for (const sourceShowId of plan.sourceShowIds) {
        await mergeShowIntoCanonical(ctx, sourceShowId, plan.canonicalShowId);
      }
    }

    const mergedSourceIds = new Set<string>(
      mergePlans.flatMap((p) => p.sourceShowIds.map((id) => String(id)))
    );

    let renamed = 0;
    let normalizedPatched = 0;
    for (const [showId, finalName] of finalNameById.entries()) {
      if (mergedSourceIds.has(showId)) continue;
      const show = byId.get(showId);
      if (!show) continue;
      const normalizedName = normalizeShowName(finalName);
      const patch: { name?: string; normalizedName?: string } = {};
      if (show.name !== finalName) {
        patch.name = finalName;
        renamed += 1;
      }
      if (show.normalizedName !== normalizedName) {
        patch.normalizedName = normalizedName;
        normalizedPatched += 1;
      }
      if (patch.name !== undefined || patch.normalizedName !== undefined) {
        await ctx.db.patch(show._id, patch);
      }
    }

    const keepDisambiguatedCount = decisions.filter(
      (d) => d.action === "keep_disambiguated"
    ).length;

    return {
      totalShowsAnalyzed: shows.length,
      mergedGroups: mergePlans.length,
      mergedSourceRows: mergedSourceIds.size,
      renamed,
      normalizedPatched,
      keepDisambiguatedCount,
    };
  },
});
