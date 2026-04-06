import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { PublicShowsGrid } from "@/features/profile/components/PublicShowsGrid";
import { TasteProfile } from "@/features/profile/components/TasteProfile";
import { TheatreChallenge } from "@/features/profile/components/TheatreChallenge";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFollowToggle } from "@/hooks/use-follow-toggle";
import { useTabNav } from "@/hooks/use-tab-nav";


export default function PublicProfileScreen() {
  const router = useRouter();
  const { pushFollowList } = useTabNav();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username : "";

  const profile = useQuery(
    api.social.profiles.getPublicProfileByUsername,
    username ? { username } : "skip",
  );
  const stats = useQuery(
    api.social.profiles.getProfileStats,
    profile ? { userId: profile._id } : "skip",
  );
  const userStats = useQuery(
    api.userStats.getUserStats,
    profile ? { userId: profile._id } : "skip",
  );
  const recentActivity = useQuery(
    api.tasteProfile.getRecentActivity,
    profile ? { userId: profile._id } : "skip",
  );
  const { toggleFollow, isFollowPending } = useFollowToggle();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  const displayName = profile?.viewerIsSelf
    ? "Me"
    : (profile?.name?.trim() || profile?.username || "Profile");

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["bottom"]}
    >
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
            <ProfileHeader
              profile={profile}
              onFollowToggle={profile.viewerIsSelf ? undefined : () => toggleFollow(profile._id, profile.viewerFollows)}
              followPending={isFollowPending(profile._id)}
              stats={stats}
              theatreRank={userStats?.theatreRank}
              streakWeeks={userStats?.currentStreakWeeks}
              activitySummary={recentActivity?.visitCount ? {
                showCount: recentActivity.showCount,
                typeCount: recentActivity.typeCount,
                percentile: recentActivity.percentile,
                locationLabel: recentActivity.locationLabel,
              } : null}
              onPressFollowers={() => pushFollowList(profile.username, "followers")}
              onPressFollowing={() => pushFollowList(profile.username, "following")}
            />

            <TheatreChallenge
              userId={profile._id}
              isSelf={profile.viewerIsSelf}
            />

            <PublicShowsGrid
              userId={profile._id}
              onPressShow={(showId, showName) =>
                router.push({ pathname: "/show/[showId]", params: { showId: String(showId), name: showName } })
              }
            />

            <TasteProfile userId={profile._id} />
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
});
