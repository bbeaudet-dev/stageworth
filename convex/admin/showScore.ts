import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchShowScorePage(
  slug: string
): Promise<{ rating: number; count: string } | null> {
  const url = `https://www.show-score.com/broadway-shows/${slug}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TheatreDiary/1.0 (score-enrichment)" },
  });
  if (!res.ok) return null;

  const html = await res.text();

  // ShowScore pages render the rating as e.g. "96%" in the main score area
  const ratingMatch = html.match(/(\d{1,3})%\s/);
  if (!ratingMatch) return null;

  const rating = parseInt(ratingMatch[1], 10);
  if (isNaN(rating) || rating < 0 || rating > 100) return null;

  // Review count like "14K+" or "588" appears near the rating
  const countMatch = html.match(/(\d[\d,]*K?\+?)\s*(?:Reviews|Ratings|reviews|ratings)/i);
  const count = countMatch ? countMatch[1] : undefined;

  return { rating, count: count ?? "" };
}

export const enrichShowWithShowScore = action({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.runQuery(
      internal.admin.showScore.getShowForEnrichment,
      { showId: args.showId }
    );
    if (!show) return;

    // Skip if data is fresh
    if (show.showScoreUpdatedAt && Date.now() - show.showScoreUpdatedAt < STALE_MS) {
      return;
    }

    // Try cached slug first, then derived slug, then derived slug + "-broadway"
    const slugsToTry: string[] = [];
    if (show.showScoreSlug) slugsToTry.push(show.showScoreSlug);
    const derived = deriveSlug(show.name);
    if (!slugsToTry.includes(derived)) slugsToTry.push(derived);
    const withSuffix = `${derived}-broadway`;
    if (!slugsToTry.includes(withSuffix)) slugsToTry.push(withSuffix);

    for (const slug of slugsToTry) {
      const result = await fetchShowScorePage(slug);
      if (result) {
        await ctx.runMutation(internal.admin.showScore.patchShowScore, {
          showId: args.showId,
          showScoreRating: result.rating,
          showScoreCount: result.count,
          showScoreSlug: slug,
          showScoreUpdatedAt: Date.now(),
        });
        return;
      }
    }

    // Mark as checked even on miss to avoid re-fetching constantly
    await ctx.runMutation(internal.admin.showScore.patchShowScore, {
      showId: args.showId,
      showScoreUpdatedAt: Date.now(),
    });
  },
});

export const getShowForEnrichment = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return null;
    return {
      name: show.name,
      showScoreSlug: show.showScoreSlug,
      showScoreUpdatedAt: show.showScoreUpdatedAt,
    };
  },
});

export const patchShowScore = internalMutation({
  args: {
    showId: v.id("shows"),
    showScoreRating: v.optional(v.number()),
    showScoreCount: v.optional(v.string()),
    showScoreSlug: v.optional(v.string()),
    showScoreUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { showId, ...patch } = args;
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(showId, cleaned);
  },
});
