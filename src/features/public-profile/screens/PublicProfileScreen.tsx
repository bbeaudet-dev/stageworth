import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { useTabNav } from "@/hooks/use-tab-nav";


export default function PublicProfileScreen() {
  const router = useRouter();
  const { pushFollowList } = useTabNav();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username : "";

  const profile = useQuery(
    api.profiles.getPublicProfileByUsername,
    username ? { username } : "skip",
  );
  const stats = useQuery(
    api.profiles.getProfileStats,
    profile ? { userId: profile._id } : "skip",
  );
  const userStats = useQuery(
    api.userStats.getUserStats,
    profile ? { userId: profile._id } : "skip",
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
              onFollowToggle={profile.viewerIsSelf ? undefined : handleFollow}
              followPending={followPending}
              stats={stats}
              theatreRank={userStats?.theatreRank}
              streakWeeks={userStats?.currentStreakWeeks}
              onPressFollowers={() => pushFollowList(profile.username, "followers")}
              onPressFollowing={() => pushFollowList(profile.username, "following")}
            />

            <TheatreChallenge
              userId={profile._id}
              isSelf={profile.viewerIsSelf}
            />

            <PublicShowsGrid userId={profile._id} />

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
