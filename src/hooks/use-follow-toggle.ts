import { useCallback, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useFollowToggle() {
  const followUser = useMutation(api.social.social.followUser);
  const unfollowUser = useMutation(api.social.social.unfollowUser);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const toggleFollow = useCallback(
    async (userId: Id<"users">, currentlyFollowing: boolean) => {
      setPendingUserId(String(userId));
      try {
        if (currentlyFollowing) {
          await unfollowUser({ userId });
        } else {
          await followUser({ userId });
        }
      } finally {
        setPendingUserId(null);
      }
    },
    [followUser, unfollowUser],
  );

  const isFollowPending = useCallback(
    (userId: Id<"users"> | string) => pendingUserId === String(userId),
    [pendingUserId],
  );

  return { toggleFollow, isFollowPending, pendingUserId };
}
