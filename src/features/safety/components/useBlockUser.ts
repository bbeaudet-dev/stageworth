/**
 * Hook wrapping the block/unblock mutations with native confirmation dialogs.
 *
 * Block confirmation explicitly names the symmetric effects (mutual hiding,
 * auto-unfollow both ways) so users aren't surprised — Apple 1.2 review
 * expects the UI to make the block contract clear.
 */
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useBlockUser() {
  const blockUser = useMutation(api.social.safety.blockUser);
  const unblockUser = useMutation(api.social.safety.unblockUser);
  const [pending, setPending] = useState(false);

  const confirmBlock = useCallback(
    (
      targetUserId: Id<"users">,
      username: string | undefined,
      onBlocked?: () => void
    ) => {
      const handle = username ? `@${username}` : "this user";
      Alert.alert(
        `Block ${handle}?`,
        `You won't see each other's posts or profile, and you'll both stop following each other. This only affects what appears to you — it does not notify ${handle}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              setPending(true);
              try {
                await blockUser({ targetUserId });
                onBlocked?.();
              } catch (e) {
                Alert.alert(
                  "Could not block",
                  e instanceof Error ? e.message : "Please try again."
                );
              } finally {
                setPending(false);
              }
            },
          },
        ]
      );
    },
    [blockUser]
  );

  const confirmUnblock = useCallback(
    (
      targetUserId: Id<"users">,
      username: string | undefined,
      onUnblocked?: () => void
    ) => {
      const handle = username ? `@${username}` : "this user";
      Alert.alert(
        `Unblock ${handle}?`,
        `${handle}'s posts and profile will become visible to you again. You'll need to re-follow them if you want them in your Friends feed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            onPress: async () => {
              setPending(true);
              try {
                await unblockUser({ targetUserId });
                onUnblocked?.();
              } catch (e) {
                Alert.alert(
                  "Could not unblock",
                  e instanceof Error ? e.message : "Please try again."
                );
              } finally {
                setPending(false);
              }
            },
          },
        ]
      );
    },
    [unblockUser]
  );

  return { confirmBlock, confirmUnblock, pending };
}
