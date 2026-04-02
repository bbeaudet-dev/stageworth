import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  isLikelyLowQualityShowName,
  mapExternalTypeToShowType,
  normalizeShowName,
  type ShowType,
} from "../showNormalization";
import { fetchJson } from "./wikiApi";

const showTypeValidator = v.union(
  v.literal("musical"),
  v.literal("play"),
  v.literal("opera"),
  v.literal("dance"),
  v.literal("other")
);

const wikidataImportEntryValidator = v.object({
  name: v.string(),
  wikidataId: v.string(),
  type: v.optional(showTypeValidator),
  rawType: v.optional(v.string()),
  sourceConfidence: v.optional(v.number()),
});

type ImportReason =
  | "empty_name"
  | "invalid_wikidata_id"
  | "low_quality_name"
  | "unmappable_type"
  | "duplicate_external"
  | "duplicate_normalized";

function addReasonCount(reasonCounts: Record<string, number>, reason: ImportReason) {
  reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
}

// Validated bulk import for historical shows from Wikidata exports.
// Safe to re-run: duplicate checks happen by external ID and normalized name.
// Run: npx convex run admin/legacyWikidata:importWikidataShows '{"entries":[...], "dryRun": true}'
export const importWikidataShows = internalMutation({
  args: {
    entries: v.array(wikidataImportEntryValidator),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const reasonCounts: Record<string, number> = {};
    const possibleDuplicates: Array<{
      incomingName: string;
      existingName: string;
      wikidataId: string;
      existingShowId: string;
    }> = [];

    type ShowLookup = {
      _id: Id<"shows">;
      name: string;
      normalizedName: string;
      externalSource?: string;
      externalId?: string;
    };

    const existingShows = await ctx.db.query("shows").collect();
    const existingByExternal = new Map<string, ShowLookup>();
    const existingByNormalized = new Map<string, ShowLookup>();
    const batchByExternal = new Map<string, { name: string }>();
    const batchByNormalized = new Map<string, { name: string }>();

    for (const show of existingShows) {
      if (show.externalSource && show.externalId) {
        existingByExternal.set(`${show.externalSource}:${show.externalId}`, show);
      }
      existingByNormalized.set(show.normalizedName, show);
    }

    let inserted = 0;
    let patched = 0;
    let quarantined = 0;
    let skipped = 0;

    for (const entry of args.entries) {
      const normalizedName = normalizeShowName(entry.name);
      if (!normalizedName) {
        quarantined += 1;
        addReasonCount(reasonCounts, "empty_name");
        continue;
      }
      if (!/^Q\d+$/.test(entry.wikidataId)) {
        quarantined += 1;
        addReasonCount(reasonCounts, "invalid_wikidata_id");
        continue;
      }
      if (isLikelyLowQualityShowName(entry.name)) {
        quarantined += 1;
        addReasonCount(reasonCounts, "low_quality_name");
        continue;
      }

      const mappedType =
        entry.type ?? (entry.rawType ? mapExternalTypeToShowType(entry.rawType) : null);
      if (!mappedType) {
        quarantined += 1;
        addReasonCount(reasonCounts, "unmappable_type");
        continue;
      }

      const externalKey = `wikidata:${entry.wikidataId}`;
      const batchExternal = batchByExternal.get(externalKey);
      if (batchExternal) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_external");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: batchExternal.name,
          wikidataId: entry.wikidataId,
          existingShowId: "batch",
        });
        continue;
      }

      const existingExternal = existingByExternal.get(externalKey);
      if (existingExternal) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_external");
        continue;
      }

      const existingNormalized = existingByNormalized.get(normalizedName);
      if (existingNormalized) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_normalized");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: existingNormalized.name,
          wikidataId: entry.wikidataId,
          existingShowId: existingNormalized._id,
        });

        if (
          !dryRun &&
          !existingNormalized.externalSource &&
          !existingNormalized.externalId
        ) {
          const patchData: {
            normalizedName: string;
            externalSource: string;
            externalId: string;
            sourceConfidence?: number;
          } = {
            normalizedName,
            externalSource: "wikidata",
            externalId: entry.wikidataId,
          };
          if (entry.sourceConfidence !== undefined) {
            patchData.sourceConfidence = Math.max(
              0,
              Math.min(1, entry.sourceConfidence)
            );
          }

          await ctx.db.patch(existingNormalized._id, {
            ...patchData,
          });
          existingNormalized.externalSource = "wikidata";
          existingNormalized.externalId = entry.wikidataId;
          existingNormalized.normalizedName = normalizedName;
          patched += 1;
          existingByExternal.set(externalKey, existingNormalized);
        }
        continue;
      }

      const batchNormalized = batchByNormalized.get(normalizedName);
      if (batchNormalized) {
        skipped += 1;
        addReasonCount(reasonCounts, "duplicate_normalized");
        possibleDuplicates.push({
          incomingName: entry.name,
          existingName: batchNormalized.name,
          wikidataId: entry.wikidataId,
          existingShowId: "batch",
        });
        continue;
      }

      if (!dryRun) {
        const sourceConfidence =
          entry.sourceConfidence !== undefined
            ? Math.max(0, Math.min(1, entry.sourceConfidence))
            : undefined;
        const createdId = await ctx.db.insert("shows", {
          name: entry.name.trim(),
          normalizedName,
          type: mappedType,
          images: [],
          isUserCreated: false,
          externalSource: "wikidata",
          externalId: entry.wikidataId,
          sourceConfidence,
        });

        const created = await ctx.db.get(createdId);
        if (created) {
          existingByExternal.set(externalKey, created);
          existingByNormalized.set(normalizedName, created);
        }
      }
      batchByExternal.set(externalKey, { name: entry.name.trim() });
      batchByNormalized.set(normalizedName, {
        name: entry.name.trim(),
      });
      inserted += 1;
    }

    return {
      dryRun,
      processed: args.entries.length,
      inserted,
      patched,
      skipped,
      quarantined,
      reasonCounts,
      possibleDuplicates,
    };
  },
});

// Re-import a fixed set of important shows directly from Wikidata via their Wikipedia pages.
// Run: npx convex run admin/legacyWikidata:importSpecificWikidataShows
export const importSpecificWikidataShows = internalAction({
  args: {},
  handler: async (ctx) => {
    const targets: Array<{
      showName: string;
      showType: ShowType;
      wikipediaTitle: string;
    }> = [
      { showName: "Mexodus", showType: "musical", wikipediaTitle: "Mexodus (musical)" },
      {
        showName: "The Phantom of the Opera",
        showType: "musical",
        wikipediaTitle: "The Phantom of the Opera (1986 musical)",
      },
      {
        showName: "Operation Mincemeat",
        showType: "musical",
        wikipediaTitle: "Operation Mincemeat (musical)",
      },
      {
        showName: "Death Becomes Her",
        showType: "musical",
        wikipediaTitle: "Death Becomes Her (musical)",
      },
      {
        showName: "Les Misérables",
        showType: "musical",
        wikipediaTitle: "Les Misérables (musical)",
      },
      {
        showName: "Hamilton",
        showType: "musical",
        wikipediaTitle: "Hamilton (musical)",
      },
      {
        showName: "Two Strangers (Carry a Cake Across New York)",
        showType: "musical",
        wikipediaTitle: "Two Strangers (Carry a Cake Across New York)",
      },
      {
        showName: "Sunset Blvd.",
        showType: "musical",
        wikipediaTitle: "Sunset Boulevard (musical)",
      },
      {
        showName: "Marcel on the Train",
        showType: "play",
        wikipediaTitle: "Marcel on the Train",
      },
      {
        showName: "Cabaret",
        showType: "musical",
        wikipediaTitle: "Cabaret (musical)",
      },
      { showName: "Gypsy", showType: "musical", wikipediaTitle: "Gypsy (musical)" },
      { showName: "Punch", showType: "play", wikipediaTitle: "Punch (play)" },
      { showName: "Oedipus", showType: "play", wikipediaTitle: "Oedipus" },
      {
        showName: "Water for Elephants",
        showType: "musical",
        wikipediaTitle: "Water for Elephants (musical)",
      },
      {
        showName: "High Spirits",
        showType: "musical",
        wikipediaTitle: "High Spirits (musical)",
      },
      {
        showName: "POTUS",
        showType: "play",
        wikipediaTitle:
          "POTUS: Or, Behind Every Great Dumbass Are Seven Women Trying to Keep Him Alive",
      },
      {
        showName: "The Heart of Robin Hood",
        showType: "play",
        wikipediaTitle: "The Heart of Robin Hood",
      },
      {
        showName: "Floyd Collins",
        showType: "musical",
        wikipediaTitle: "Floyd Collins (musical)",
      },
      { showName: "The Disappear", showType: "play", wikipediaTitle: "The Disappear" },
      {
        showName: "Moulin Rouge!",
        showType: "musical",
        wikipediaTitle: "Moulin Rouge! (musical)",
      },
    ];

    const entries: Array<{
      name: string;
      wikidataId: string;
      type: ShowType;
      rawType?: string;
    }> = [];
    const missing: Array<{ showName: string; wikipediaTitle: string; reason: string }> = [];

    for (const t of targets) {
      try {
        const query = await fetchJson(
          `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(
            t.wikipediaTitle
          )}&format=json`
        );
        const pages = query?.query?.pages ?? {};
        const page: any = Object.values(pages)[0];
        if (!page || page.missing) {
          missing.push({
            showName: t.showName,
            wikipediaTitle: t.wikipediaTitle,
            reason: "page-missing",
          });
          continue;
        }
        const qid: string | undefined = page.pageprops?.wikibase_item;
        if (!qid || !/^Q\d+$/i.test(qid)) {
          missing.push({
            showName: t.showName,
            wikipediaTitle: t.wikipediaTitle,
            reason: "no-wikibase-item",
          });
          continue;
        }
        entries.push({
          name: t.showName,
          wikidataId: qid,
          type: t.showType,
        });
      } catch (err) {
        missing.push({
          showName: t.showName,
          wikipediaTitle: t.wikipediaTitle,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let importResult: any = null;
    if (entries.length > 0) {
      importResult = await ctx.runMutation(internal.admin.legacyWikidata.importWikidataShows, {
        entries,
        dryRun: false,
      });
    }

    return {
      requested: targets.length,
      prepared: entries.length,
      importResult,
      missing,
    };
  },
});
