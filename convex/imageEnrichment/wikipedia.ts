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
