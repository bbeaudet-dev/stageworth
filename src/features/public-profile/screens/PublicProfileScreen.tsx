import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { PublicShowsGrid } from "@/features/profile/components/PublicShowsGrid";
import { TasteProfile } from "@/features/profile/components/TasteProfile";
import { TheatreChallenge } from "@/features/profile/components/TheatreChallenge";
import { ReportSheet } from "@/features/safety/components/ReportSheet";
import { useSafetyActions } from "@/features/safety/components/useSafetyActions";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFollowToggle } from "@/hooks/use-follow-toggle";

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username : "";

  const profile = useQuery(
    api.social.profiles.getPublicProfileByUsername,
    username ? { username } : "skip",
  );
  const isBlockedProfile = profile?.viewerIsBlocked ?? false;
  const stats = useQuery(
    api.social.profiles.getProfileStats,
    profile && !isBlockedProfile ? { userId: profile._id } : "skip",
  );
  const userStats = useQuery(
    api.userStats.getUserStats,
    profile && !isBlockedProfile ? { userId: profile._id } : "skip",
  );
  const recentActivity = useQuery(
    api.tasteProfile.getRecentActivity,
    profile && !isBlockedProfile ? { userId: profile._id } : "skip",
  );
  const { toggleFollow, isFollowPending } = useFollowToggle();
  const { openSafetyActions, reportTarget, closeReportSheet } =
    useSafetyActions();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const textColor = Colors[theme].text;

  const displayName = profile?.viewerIsSelf
    ? "Me"
    : (profile?.name?.trim() || profile?.username || "Profile");

  const showOverflow = !!profile && !profile.viewerIsSelf && !isBlockedProfile;

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
          headerRight: showOverflow
            ? () => (
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="More actions"
                  onPress={() =>
                    openSafetyActions({
                      kind: "user",
                      user: {
                        userId: profile!._id,
                        username: profile!.username,
                      },
                    })
                  }
                  style={styles.headerRight}
                >
                  <IconSymbol name="ellipsis" size={22} color={textColor} />
                </Pressable>
              )
            : undefined,
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
        {profile && isBlockedProfile && (
          <Text style={[styles.emptyText, { color: mutedTextColor }]}>
            This profile is unavailable.
          </Text>
        )}
        {profile && !isBlockedProfile && (
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
                percentile: recentActivity.percentile,
                seasonLabel: recentActivity.seasonLabel,
              } : null}
              onPressFollowers={() => router.push({ pathname: "/user/[username]/[kind]", params: { username: profile.username, kind: "followers" } })}
              onPressFollowing={() => router.push({ pathname: "/user/[username]/[kind]", params: { username: profile.username, kind: "following" } })}
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
      {reportTarget && (
        <ReportSheet
          visible={reportTarget !== null}
          onClose={closeReportSheet}
          target={reportTarget}
        />
      )}
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
  headerRight: { paddingHorizontal: 8 },
});
