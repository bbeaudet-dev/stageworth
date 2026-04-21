import { TESTFLIGHT_PUBLIC_URL } from "@/lib/testflight";

export { TESTFLIGHT_PUBLIC_URL };

/**
 * URL for Android beta installs — usually an Expo **build** page (expo.dev/.../builds/...)
 * where testers download the `.apk`. Point `NEXT_PUBLIC_ANDROID_APK_URL` at the current
 * build in Vercel and redeploy whenever you ship a new Android build (no CI yet).
 */
export function getAndroidApkUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
  if (!url || url.trim() === "") return undefined;
  return url.trim();
}
