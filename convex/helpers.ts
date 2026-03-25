import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
 * Resolve images for a show, falling back to a production posterImage when
 * show.images is empty. This covers shows whose art is stored on productions
 * rather than on the show record itself.
 */
export async function resolveShowImageUrls(
  ctx: Pick<QueryCtx, "db" | "storage">,
  show: { _id: Id<"shows">; images: Id<"_storage">[] }
): Promise<string[]> {
  if (show.images.length > 0) {
    return resolveImageUrls(ctx, show.images);
  }
  // Find the first production for this show that has a posterImage.
  const productions = await ctx.db
    .query("productions")
    .withIndex("by_show", (q) => q.eq("showId", show._id))
    .collect();
  const withPoster = productions.find((p) => p.posterImage);
  if (withPoster?.posterImage) {
    const url = await ctx.storage.getUrl(withPoster.posterImage);
    return url ? [url] : [];
  }
  return [];
}
