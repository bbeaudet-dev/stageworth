const DEFAULT_WEBSITE_BASE_URL = "https://stageworth.vercel.app";

const trimmedWebsiteBaseUrl = (
  process.env.EXPO_PUBLIC_WEBSITE_URL ?? DEFAULT_WEBSITE_BASE_URL
).replace(/\/+$/, "");

export const WEBSITE_BASE_URL = trimmedWebsiteBaseUrl;

export const LEGAL_URLS = {
  privacyPolicy: `${WEBSITE_BASE_URL}/privacy`,
  termsOfService: `${WEBSITE_BASE_URL}/terms`,
} as const;

/** Apple App Store ID for Stageworth (matches the live App Store listing). */
export const APP_STORE_ID = "6761304800";

export const APP_STORE_URLS = {
  /** Public listing — works in any browser, also opens App Store on iOS. */
  listing: `https://apps.apple.com/us/app/stageworth/id${APP_STORE_ID}`,
  /**
   * Deep link that opens the App Store directly to the review composer on iOS.
   * Use Linking.openURL — no native dep needed (vs. expo-store-review, which
   * is only for the auto-quota'd in-app star prompt).
   */
  writeReview: `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`,
} as const;
