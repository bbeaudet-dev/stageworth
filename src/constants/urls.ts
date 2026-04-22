const DEFAULT_WEBSITE_BASE_URL = "https://stageworth.vercel.app";

const trimmedWebsiteBaseUrl = (
  process.env.EXPO_PUBLIC_WEBSITE_URL ?? DEFAULT_WEBSITE_BASE_URL
).replace(/\/+$/, "");

export const WEBSITE_BASE_URL = trimmedWebsiteBaseUrl;

export const LEGAL_URLS = {
  privacyPolicy: `${WEBSITE_BASE_URL}/privacy`,
  termsOfService: `${WEBSITE_BASE_URL}/terms`,
} as const;
