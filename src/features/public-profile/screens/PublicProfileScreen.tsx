import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username : "";

  const profile = useQuery(
    api.profiles.getPublicProfileByUsername,
    username ? { username } : "skip"
  );
  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const [followPending, setFollowPending] = useState(false);

  const handleFollow = async () => {
    if (!profile || profile.viewerIsSelf || followPending) return;
    setFollowPending(true);
    try {
      if (profile.viewerFollows) {
        await unfollowUser({ userId: profile._id });
      } else {
        await followUser({ userId: profile._id });
      }
    } finally {
      setFollowPending(false);
    }
  };

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const displayName = profile?.name?.trim() || profile?.username || "Profile";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: displayName,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profile === undefined && (
          <ActivityIndicator style={styles.loader} color={accentColor} />
        )}
        {profile === null && (
          <Text style={[styles.emptyText, { color: mutedTextColor }]}>
            User not found.
          </Text>
        )}
        {profile && (
          <>
            {/* Header card */}
            <View style={[styles.headerCard, { backgroundColor: surfaceColor, borderColor }]}>
              {/* Avatar + stats */}
              <View style={styles.avatarStatsRow}>
                <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
                  {profile.avatarUrl ? (
                    <Image
                      source={{ uri: profile.avatarUrl }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: accentColor }]}>
                      {getInitials(profile.name, profile.username)}
                    </Text>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <Pressable
                    style={styles.statBlock}
                    onPress={() =>
                      router.push({
                        pathname: "/user/[username]/[kind]",
                        params: { username: profile.username, kind: "followers" },
                      })
                    }
                  >
                    <Text style={[styles.statNumber, { color: primaryTextColor }]}>
                      {profile.followerCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: mutedTextColor }]}>
                      Followers
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.statBlock}
                    onPress={() =>
                      router.push({
                        pathname: "/user/[username]/[kind]",
                        params: { username: profile.username, kind: "following" },
                      })
                    }
                  >
                    <Text style={[styles.statNumber, { color: primaryTextColor }]}>
                      {profile.followingCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: mutedTextColor }]}>
                      Following
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Identity */}
              <Text style={[styles.displayName, { color: primaryTextColor }]}>
                {displayName}
              </Text>
              <Text style={[styles.handle, { color: mutedTextColor }]}>
                @{profile.username}
              </Text>
              {profile.bio ? (
                <Text style={[styles.bio, { color: primaryTextColor }]}>
                  {profile.bio}
                </Text>
              ) : null}
              {profile.location ? (
                <Text style={[styles.location, { color: mutedTextColor }]}>
                  {profile.location}
                </Text>
              ) : null}
            </View>

            {/* Follow button */}
            {!profile.viewerIsSelf ? (
              <Pressable
                style={[
                  styles.followBtn,
                  profile.viewerFollows
                    ? { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor }
                    : { backgroundColor: accentColor },
                  followPending && styles.followBtnDisabled,
                ]}
                onPress={handleFollow}
                disabled={followPending}
              >
                {followPending ? (
                  <ActivityIndicator
                    size="small"
                    color={profile.viewerFollows ? mutedTextColor : "#fff"}
                  />
                ) : (
                  <Text
                    style={[
                      styles.followBtnText,
                      { color: profile.viewerFollows ? primaryTextColor : "#fff" },
                    ]}
                  >
                    {profile.viewerFollows ? "Following" : "Follow"}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {/* Future content area: rankings, trips, lists, posts */}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  loader: { marginTop: 40 },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  headerCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 4,
  },
  avatarStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: "700",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBlock: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  displayName: {
    fontSize: 18,
    fontWeight: "700",
  },
  handle: {
    fontSize: 14,
    fontWeight: "500",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  followBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  followBtnDisabled: {
    opacity: 0.6,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
