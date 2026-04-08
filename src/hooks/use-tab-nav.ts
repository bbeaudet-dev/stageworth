import { useRouter, useSegments } from "expo-router";
import { useCallback, useMemo } from "react";

/**
 * Returns navigation helpers that stay within the current tab stack.
 * Keeps the tab bar visible and back button working correctly.
 */
export function useTabNav() {
  const router = useRouter();
  const segments = useSegments();

  const tabKey = useMemo<"community" | "plan" | "search" | "my-shows" | "profile">(() => {
    const root = segments[0];
    const tabSlug = segments.length > 1 ? segments[1] : undefined;
    if (root === "(tabs)" && tabSlug === "community") return "community";
    if (root === "(tabs)" && tabSlug === "plan") return "plan";
    if (root === "(tabs)" && tabSlug === "search") return "search";
    if (root === "(tabs)" && tabSlug === "my-shows") return "my-shows";
    return "profile";
  }, [segments]);

  const pushUserProfile = useCallback(
    (username: string) => {
      if (tabKey === "community") {
        router.push({ pathname: "/(tabs)/community/user/[username]", params: { username } });
      } else if (tabKey === "plan") {
        router.push({ pathname: "/(tabs)/plan/user/[username]", params: { username } });
      } else if (tabKey === "search") {
        router.push({ pathname: "/(tabs)/search/user/[username]", params: { username } });
      } else if (tabKey === "my-shows") {
        router.push({ pathname: "/(tabs)/my-shows/user/[username]", params: { username } });
      } else {
        router.push({ pathname: "/(tabs)/profile/user/[username]", params: { username } });
      }
    },
    [router, tabKey],
  );

  const pushFollowList = useCallback(
    (username: string, kind: "followers" | "following") => {
      if (tabKey === "community") {
        router.push({
          pathname: "/(tabs)/community/user/[username]/[kind]",
          params: { username, kind },
        });
      } else if (tabKey === "plan") {
        router.push({
          pathname: "/(tabs)/plan/user/[username]/[kind]",
          params: { username, kind },
        });
      } else if (tabKey === "search") {
        router.push({
          pathname: "/(tabs)/search/user/[username]/[kind]",
          params: { username, kind },
        });
      } else if (tabKey === "my-shows") {
        router.push({
          pathname: "/(tabs)/my-shows/user/[username]/[kind]",
          params: { username, kind },
        });
      } else {
        router.push({
          pathname: "/(tabs)/profile/user/[username]/[kind]",
          params: { username, kind },
        });
      }
    },
    [router, tabKey],
  );

  return { pushUserProfile, pushFollowList };
}
