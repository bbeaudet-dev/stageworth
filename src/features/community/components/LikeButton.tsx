/**
 * LikeButton — heart toggle with denormalized count and optimistic UI.
 *
 * Contract:
 *   The parent passes in the *server values* (`liked`, `likeCount`). This
 *   component keeps a local mirror that flips instantly on tap, then calls the
 *   toggle mutation. If the server reports a different state (e.g. the post
 *   was already liked by this user in another tab), we reconcile using the
 *   latest props via `useEffect`.
 *
 *   The mutation itself is a simple no-optimistic Convex mutation — we rely on
 *   the reactive query refresh to bring the authoritative state back within
 *   one round-trip. Local state keeps the heart filled in the meantime.
 *
 *   `stopPropagation` on the outer Pressable prevents the parent card's
 *   `onPress` (which typically navigates away) from firing when a user taps
 *   the heart.
 */

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Props = {
  postId: Id<"activityPosts">;
  liked: boolean;
  likeCount: number;
};

export function LikeButton({ postId, liked, likeCount }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const toggleLike = useMutation(api.social.likes.togglePostLike);

  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(likeCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) {
      setLocalLiked(liked);
      setLocalCount(likeCount);
    }
  }, [liked, likeCount, pending]);

  const heartColor = localLiked
    ? "#ef4444"
    : theme === "dark"
      ? "#a0a4aa"
      : "#666";
  const countColor = theme === "dark" ? "#d4d4d8" : "#444";

  const onPress = async () => {
    if (pending) return;
    const nextLiked = !localLiked;
    const nextCount = Math.max(0, localCount + (nextLiked ? 1 : -1));
    setLocalLiked(nextLiked);
    setLocalCount(nextCount);
    setPending(true);
    try {
      const result = await toggleLike({ postId });
      setLocalLiked(result.liked);
      setLocalCount(result.likeCount);
    } catch {
      setLocalLiked(!nextLiked);
      setLocalCount(Math.max(0, nextCount + (nextLiked ? -1 : 1)));
    } finally {
      setPending(false);
    }
  };

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={localLiked ? "Unlike post" : "Like post"}
      accessibilityState={{ selected: localLiked }}
    >
      <View style={styles.inner}>
        <IconSymbol
          name={localLiked ? "heart.fill" : "heart"}
          size={18}
          color={heartColor}
        />
        {localCount > 0 ? (
          <Text style={[styles.count, { color: countColor }]}>{localCount}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    fontSize: 13,
    fontWeight: "600",
  },
});
