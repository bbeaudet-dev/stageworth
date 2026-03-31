import { useRouter, useSegments } from "expo-router";
import { useCallback, useMemo } from "react";

/**
 * Returns navigation helpers that stay within the current tab stack.
 * Keeps the tab bar visible and back button working correctly.
 */
export function useTabNav() {
  const router = useRouter();
  const segments = useSegments();

  const basePath = useMemo(() => {
    if (segments[0] === "(tabs)" && segments[1]) {
      return `/(tabs)/${segments[1]}`;
    }
    return "";
  }, [segments]);

  const pushUserProfile = useCallback(
    (username: string) => {
      router.push({
        pathname: `${basePath}/user/[username]`,
        params: { username },
      } as any);
    },
    [router, basePath],
  );

  const pushFollowList = useCallback(
    (username: string, kind: "followers" | "following") => {
      router.push({
        pathname: `${basePath}/user/[username]/[kind]`,
        params: { username, kind },
      } as any);
    },
    [router, basePath],
  );

  return { pushUserProfile, pushFollowList };
}
