import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTabNav } from "@/hooks/use-tab-nav";

type FollowKind = "followers" | "following";

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

type FollowRow = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
  viewerFollows: boolean;
  viewerIsSelf: boolean;
};

export default function FollowListScreen() {
  const { pushUserProfile } = useTabNav();
  const params = useLocalSearchParams<{ username?: string; kind?: string }>();
  const username = typeof params.username === "string" ? params.username : "";
  const kind: FollowKind = params.kind === "following" ? "following" : "followers";

  const profile = useQuery(
    api.social.profiles.getPublicProfileByUsername,
    username ? { username } : "skip"
  );
  const followers = useQuery(
    api.social.social.listFollowers,
    profile && kind === "followers" ? { userId: profile._id, limit: 100 } : "skip"
  );
  const following = useQuery(
    api.social.social.listFollowing,
    profile && kind === "following" ? { userId: profile._id, limit: 100 } : "skip"
  );

  const followUser = useMutation(api.social.social.followUser);
  const unfollowUser = useMutation(api.social.social.unfollowUser);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleToggleFollow = useCallback(
    async (userId: Id<"users">, viewerFollows: boolean) => {
      setPendingUserId(String(userId));
      try {
        if (viewerFollows) {
          await unfollowUser({ userId });
        } else {
          await followUser({ userId });
        }
      } finally {
        setPendingUserId(null);
      }
    },
    [followUser, unfollowUser]
  );

  const rows = (kind === "followers" ? (followers ?? []) : (following ?? [])) as FollowRow[];
  const title = kind === "followers" ? "Followers" : "Following";

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;

  const isLoading =
    profile === undefined ||
    (kind === "followers" ? followers === undefined : following === undefined);

  const renderItem = useCallback(
    ({ item }: { item: FollowRow }) => {
      const displayName = item.name?.trim() || item.username;
      const busy = pendingUserId === String(item._id);

      return (
        <View style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}>
          <Pressable
            style={styles.rowMain}
            onPress={() => pushUserProfile(item.username)}
          >
            <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: accentColor }]}>
                  {getInitials(item.name, item.username)}
                </Text>
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: primaryTextColor }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.handle, { color: mutedTextColor }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
          </Pressable>

          {item.viewerIsSelf ? (
            <View style={styles.selfBadge}>
              <Text style={[styles.selfBadgeText, { color: mutedTextColor }]}>You</Text>
            </View>
          ) : (
            <Pressable
              disabled={busy}
              onPress={() => handleToggleFollow(item._id, item.viewerFollows)}
              style={[
                styles.followBtn,
                item.viewerFollows
                  ? { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor }
                  : { backgroundColor: accentColor },
                busy && styles.followBtnDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={item.viewerFollows ? mutedTextColor : onAccent}
                />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    { color: item.viewerFollows ? primaryTextColor : onAccent },
                  ]}
                >
                  {item.viewerFollows ? "Following" : "Follow"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      );
    },
    [
      accentColor,
      borderColor,
      handleToggleFollow,
      mutedTextColor,
      pendingUserId,
      primaryTextColor,
      pushUserProfile,
      surfaceColor,
    ]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{ headerShown: true, title, headerBackButtonDisplayMode: "minimal" }}
      />
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={accentColor} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>
              No {title.toLowerCase()} yet.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  handle: {
    fontSize: 13,
    marginTop: 2,
  },
  followBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnDisabled: { opacity: 0.7 },
  followBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  selfBadge: {
    minWidth: 96,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  selfBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
