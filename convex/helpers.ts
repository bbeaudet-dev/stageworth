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
