import type { Id } from "@/convex/_generated/dataModel";

export const MAX_VISIT_PHOTOS = 5;

export async function uploadVisitPhotoToConvex(
  localUri: string,
  getUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const postUrl = await getUploadUrl();
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();
  const contentType =
    blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/jpeg";
  const uploadRes = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(`Upload failed (${uploadRes.status}): ${text.slice(0, 120)}`);
  }
  const data = (await uploadRes.json()) as { storageId?: string };
  if (!data.storageId) throw new Error("Upload did not return storage id");
  return data.storageId as Id<"_storage">;
}

export async function uploadVisitPhotos(
  uris: string[],
  getUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">[]> {
  const capped = uris.slice(0, MAX_VISIT_PHOTOS);
  const ids: Id<"_storage">[] = [];
  for (const uri of capped) {
    ids.push(await uploadVisitPhotoToConvex(uri, getUploadUrl));
  }
  return ids;
}
