import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  wikipediaTitleCandidates,
  encodeWikipediaTitle,
  scoreNameMatch,
  isAcceptableMatch,
} from "./nameMatch";

const USER_AGENT = "StageworthApp/1.0 (https://github.com/stageworth)";
const BATCH_SIZE = 100;
const DELAY_MS = 150; // ~6–7 req/s, well within Wikipedia's 200 req/s guidance
const MAX_RETRIES = 3;

type WikiSummary = {
  title: string;
  type: string;
  extract?: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit
): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return null;
      }
      const backoff = 1000 * 2 ** attempt;
      await sleep(backoff);
    }
  }
  return null;
}

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeWikipediaTitle(title)}`;
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res || !res.ok) return null;
  return (await res.json()) as WikiSummary;
}

async function searchWikipedia(showName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: `${showName} broadway`,
    format: "json",
    srlimit: "3",
  });
  const res = await fetchWithRetry(
    `https://en.wikipedia.org/w/api.php?${params.toString()}`,
    { headers: { "User-Agent": USER_AGENT } }
  );
  if (!res || !res.ok) return null;
  const data = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  return data.query?.search?.[0]?.title ?? null;
}

/**
 * Try the Wikipedia title ladder for a show, returning the image URL and
 * resolved article title on success, or null on failure.
 */
async function resolveWikipediaImage(
  showName: string,
  showType: "musical" | "play" | "opera" | "dance" | "revue" | "comedy" | "magic" | "other"
): Promise<{ imageUrl: string; articleTitle: string } | null> {
  const candidates = wikipediaTitleCandidates(showName, showType);

  for (const title of candidates) {
    const summary = await fetchWikiSummary(title);
    if (!summary) continue;
    // Guard against disambiguation pages
    if (summary.type === "disambiguation") continue;
    const score = scoreNameMatch(showName, summary.title);
    if (!isAcceptableMatch(score)) continue;
    const imgUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
    if (imgUrl) return { imageUrl: imgUrl, articleTitle: summary.title };
  }

  // Fallback: Wikipedia search API
  const searchTitle = await searchWikipedia(showName);
  if (searchTitle) {
    const summary = await fetchWikiSummary(searchTitle);
    if (summary && summary.type !== "disambiguation") {
      const score = scoreNameMatch(showName, summary.title);
      if (isAcceptableMatch(score)) {
        const imgUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
        if (imgUrl) return { imageUrl: imgUrl, articleTitle: summary.title };
      }
    }
  }

  return null;
}

// ─── Chunked backfill action ────────────────────────────────────────────────

export const backfillWikipediaImages = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await ctx.runQuery(
      internal.imageEnrichment.queries.showsNeedingImages,
      { limit: BATCH_SIZE, cursor: args.cursor ?? undefined }
    );

    let enriched = 0;
    let failed = 0;

    for (const show of batch.shows) {
      const result = await resolveWikipediaImage(show.name, show.type);
      if (result) {
        await ctx.runMutation(
          internal.imageEnrichment.mutations.setShowHotlinkImage,
          {
            showId: show._id,
            hotlinkImageUrl: result.imageUrl,
            hotlinkImageSource: "wikipedia",
            wikipediaTitle: result.articleTitle,
          }
        );
        enriched++;
      } else {
        await ctx.runMutation(
          internal.imageEnrichment.mutations.markWikipediaChecked,
          { showId: show._id }
        );
        failed++;
      }
      await sleep(DELAY_MS);
    }

    // Schedule next batch if there are more.
    if (batch.hasMore && batch.nextCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.imageEnrichment.wikipedia.backfillWikipediaImages,
        { cursor: batch.nextCursor }
      );
    }
  },
});

/**
 * Enrich a single show with a Wikipedia image. Suitable for scheduling
 * from bot ingestion or on-demand enrichment.
 */
export const enrichShowWikipedia = internalAction({
  args: {
    showId: v.id("shows"),
    showName: v.string(),
    showType: v.union(
      v.literal("musical"),
      v.literal("play"),
      v.literal("opera"),
      v.literal("dance"),
      v.literal("revue"),
      v.literal("comedy"),
      v.literal("magic"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    const result = await resolveWikipediaImage(args.showName, args.showType);
    if (result) {
      await ctx.runMutation(
        internal.imageEnrichment.mutations.setShowHotlinkImage,
        {
          showId: args.showId,
          hotlinkImageUrl: result.imageUrl,
          hotlinkImageSource: "wikipedia",
          wikipediaTitle: result.articleTitle,
        }
      );
    }
  },
});

// ─── Wikipedia description fallback ──────────────────────────────────────────
// Long-tail coverage for shows with no Playbill mapping. Pulls
// summary.extract, strips Wikipedia's genre-taxonomy opener, and writes to
// shows.description with descriptionSource: "wikipedia".

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wikipedia leads most show articles with a formulaic genre sentence:
 *   "Hadestown is a musical with music, lyrics, and book by Anaïs Mitchell."
 *   "Rent is a rock musical with music, lyrics, and book by Jonathan Larson."
 *   "Hamilton is a sung-and-rapped-through biographical musical..."
 *
 * That framing is accurate but drains the voice we want for a user-facing
 * blurb. Strip it when present, keep the rest. If stripping leaves too
 * little, return the original.
 */
function stripGenreOpener(showName: string, extract: string): string {
  const pattern = new RegExp(
    `^${escapeRegex(showName)} is (a|an|the) [^.]+\\.\\s*`,
    "i"
  );
  const stripped = extract.replace(pattern, "").trim();
  return stripped.length >= 50 ? stripped : extract;
}

/**
 * Resolve a Wikipedia summary (title + extract) for a show. Mirrors
 * `resolveWikipediaImage`'s title-ladder → search fallback flow, but returns
 * the article extract instead of an image URL.
 */
async function resolveWikipediaSummary(
  showName: string,
  showType:
    | "musical"
    | "play"
    | "opera"
    | "dance"
    | "revue"
    | "comedy"
    | "magic"
    | "other"
): Promise<{ extract: string; articleTitle: string } | null> {
  const candidates = wikipediaTitleCandidates(showName, showType);

  for (const title of candidates) {
    const summary = await fetchWikiSummary(title);
    if (!summary) continue;
    if (summary.type === "disambiguation") continue;
    const score = scoreNameMatch(showName, summary.title);
    if (!isAcceptableMatch(score)) continue;
    if (summary.extract && summary.extract.length >= 60) {
      return { extract: summary.extract, articleTitle: summary.title };
    }
  }

  const searchTitle = await searchWikipedia(showName);
  if (searchTitle) {
    const summary = await fetchWikiSummary(searchTitle);
    if (summary && summary.type !== "disambiguation") {
      const score = scoreNameMatch(showName, summary.title);
      if (isAcceptableMatch(score) && summary.extract && summary.extract.length >= 60) {
        return { extract: summary.extract, articleTitle: summary.title };
      }
    }
  }

  return null;
}

/**
 * Chunked backfill that pulls Wikipedia descriptions for shows whose
 * description is still empty. Targets the long tail that Playbill mapping
 * couldn't cover; Playbill remains primary when available.
 *
 * Same batching + pacing as backfillWikipediaImages — we're a good citizen
 * against the shared Wikipedia REST API.
 */
export const backfillWikipediaDescriptions = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const batch = await ctx.runQuery(
      internal.imageEnrichment.queries.showsNeedingDescriptions,
      { limit: BATCH_SIZE, cursor: args.cursor ?? undefined }
    );

    for (const show of batch.shows) {
      const result = await resolveWikipediaSummary(show.name, show.type);
      if (result) {
        const cleaned = stripGenreOpener(show.name, result.extract);
        await ctx.runMutation(
          internal.imageEnrichment.mutations.setShowWikipediaDescription,
          {
            showId: show._id,
            description: cleaned,
            wikipediaTitle: result.articleTitle,
          }
        );
      } else {
        await ctx.runMutation(
          internal.imageEnrichment.mutations.markDescriptionChecked,
          { showId: show._id }
        );
      }
      await sleep(DELAY_MS);
    }

    if (batch.hasMore && batch.nextCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.imageEnrichment.wikipedia.backfillWikipediaDescriptions,
        { cursor: batch.nextCursor }
      );
    }
  },
});
