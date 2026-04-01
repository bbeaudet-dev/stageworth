/**
 * Whether to use an OAuth provider `picture` / `image` URL as the in-app avatar.
 *
 * **Google:** The OIDC `picture` claim is still set when the user has only Google’s
 * auto-generated “initial on a color” image — often unique URLs, so we **cannot**
 * reliably detect those from the URL without Google People API (`photos.default`).
 * We only filter **legacy / shared placeholder** paths that are clearly not a user photo.
 *
 * **Apple:** Profile URLs are typically omitted or a real CDN image — we allow HTTPS
 * Apple/CDN hosts as-is when not matching obvious placeholders.
 */

function isLikelyLegacyGooglePlaceholderAvatar(urlLower: string): boolean {
  if (!urlLower.includes("googleusercontent.com")) return false;
  // Legacy shared default strip used for “no custom photo” in older Google URLs
  if (urlLower.includes("aaaaaaaaaaai")) return true;
  // Historical default avatar user id segment
  if (urlLower.includes("xduiqdmkcwa")) return true;
  if (urlLower.includes("default-user")) return true;
  return false;
}

export function shouldUseOauthProfileImageUrl(
  url: string | null | undefined
): url is string {
  if (url == null || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("https://") && !lower.startsWith("http://")) return false;
  if (isLikelyLegacyGooglePlaceholderAvatar(lower)) return false;
  return true;
}
