import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { api } from "@/convex/_generated/api";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileMapSection } from "@/features/profile/components/ProfileMapSection";
import { PublicShowsGrid } from "@/features/profile/components/PublicShowsGrid";
import { useProfileSettingsDrawer } from "@/features/profile/ProfileSettingsDrawerProvider";
import { TasteProfile } from "@/features/profile/components/TasteProfile";
import { TheatreChallenge } from "@/features/profile/components/TheatreChallenge";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { data: session } = useSession();
  const { openDrawer } = useProfileSettingsDrawer();
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const stats = useQuery(api.social.profiles.getProfileStats, {});
  const userStats = useQuery(api.userStats.getUserStats, {});
  const recentActivity = useQuery(api.tasteProfile.getRecentActivity, {});

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;

  if (!myProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: primaryTextColor }]}>Profile</Text>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: mutedTextColor }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: primaryTextColor }]}>Profile</Text>
        <Pressable
          onPress={openDrawer}
          hitSlop={10}
          style={styles.settingsBtn}
        >
          <IconSymbol name="line.3.horizontal" size={24} color={primaryTextColor} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={myProfile}
          sessionDisplayName={session?.user?.name}
          sessionAvatarUrl={
            typeof session?.user?.image === "string"
              ? session.user.image
              : undefined
          }
          stats={stats}
          theatreRank={userStats?.theatreRank}
          streakWeeks={userStats?.currentStreakWeeks}
          activitySummary={recentActivity?.visitCount ? {
            showCount: recentActivity.showCount,
            typeCount: recentActivity.typeCount,
            percentile: recentActivity.percentile,
            locationLabel: recentActivity.locationLabel,
          } : null}
          onPressFollowers={() =>
            router.push({
              pathname: "/(tabs)/profile/user/[username]/[kind]",
              params: { username: myProfile.username, kind: "followers" },
            })
          }
          onPressFollowing={() =>
            router.push({
              pathname: "/(tabs)/profile/user/[username]/[kind]",
              params: { username: myProfile.username, kind: "following" },
            })
          }
        />

        <TheatreChallenge />

        {myProfile._id && (
          <PublicShowsGrid
            userId={myProfile._id}
            onPressShow={(showId, showName) =>
              router.push({ pathname: "/show/[showId]", params: { showId: String(showId), name: showName } })
            }
          />
        )}

        <ProfileMapSection />

        <TasteProfile />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  settingsBtn: {
    padding: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
  },
});
