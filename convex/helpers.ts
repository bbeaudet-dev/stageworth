import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isCatalogPublished } from "./catalogVisibility";

/**
 * Resolve an array of storage IDs to their serving URLs.
 * Filters out any IDs that no longer have a valid URL.
 */
export async function resolveImageUrls(
  ctx: Pick<QueryCtx, "storage">,
  storageIds: Id<"_storage">[]
): Promise<string[]> {
  if (storageIds.length === 0) return [];
  const urls = await Promise.all(
    storageIds.map((id) => ctx.storage.getUrl(id))
  );
  return urls.filter((u): u is string => u !== null);
}

/**
 * Full show-level image resolution hierarchy:
 *   1. Curated storage images (show.images)
 *   2. Ticketmaster hotlink URL (show.hotlinkImageUrl where source=ticketmaster)
 *   3. Wikipedia hotlink URL (show.hotlinkImageUrl where source=wikipedia)
 *   4. First production with a poster (hotlinkPosterUrl or posterImage storage)
 */
export async function resolveShowImageUrls(
  ctx: Pick<QueryCtx, "db" | "storage">,
  show: {
    _id: Id<"shows">;
    images: Id<"_storage">[];
    hotlinkImageUrl?: string;
  }
): Promise<string[]> {
  if (show.images.length > 0) {
    const urls = await resolveImageUrls(ctx, show.images);
    if (urls.length > 0) return urls;
    // Storage IDs all resolved to null (stale refs) — fall through to hotlink/productions.
  }
  if (show.hotlinkImageUrl) {
    return [show.hotlinkImageUrl];
  }
  // Fall back to the first production that has any image.
  const productions = await ctx.db
    .query("productions")
    .withIndex("by_show", (q) => q.eq("showId", show._id))
    .collect();
  for (const p of productions) {
    if (!isCatalogPublished(p.dataStatus)) continue;
    if (p.hotlinkPosterUrl) return [p.hotlinkPosterUrl];
    if (p.posterImage) {
      const url = await ctx.storage.getUrl(p.posterImage);
      if (url) return [url];
    }
  }
  return [];
}

/**
 * Resolve the best poster URL for a single production.
 * Hierarchy: hotlinkPosterUrl → posterImage (storage).
 */
export async function resolveProductionPosterUrl(
  ctx: Pick<QueryCtx, "storage">,
  production: {
    posterImage?: Id<"_storage">;
    hotlinkPosterUrl?: string;
  }
): Promise<string | null> {
  if (production.hotlinkPosterUrl) return production.hotlinkPosterUrl;
  if (production.posterImage) {
    return await ctx.storage.getUrl(production.posterImage);
  }
  return null;
}
