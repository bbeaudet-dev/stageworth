import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { styles } from "@/features/public-profile/styles";
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
  const currentUserId = useQuery(api.auth.getConvexUserIdQuery);
  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);

  const handleFollow = async () => {
    if (!profile) return;
    if (profile.viewerIsSelf) return;
    if (profile.viewerFollows) {
      await unfollowUser({ userId: profile._id });
      return;
    }
    await followUser({ userId: profile._id });
  };

  const displayName = profile?.name?.trim() || profile?.username || "Profile";
  const isOwnProfile = profile ? currentUserId === profile._id : false;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const accentColor = Colors[theme].accent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: displayName,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {profile === undefined ? (
          <Text style={[styles.loading, { color: mutedTextColor }]}>Loading profile...</Text>
        ) : null}
        {profile === null ? (
          <Text style={[styles.loading, { color: mutedTextColor }]}>User not found.</Text>
        ) : null}
        {profile ? (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.profileAvatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.profileAvatarFallback,
                  { backgroundColor: accentColor + "22" },
                ]}
              >
                <Text
                  style={[
                    styles.profileAvatarFallbackText,
                    { color: accentColor },
                  ]}
                >
                  {getInitials(profile.name, profile.username)}
                </Text>
              </View>
            )}
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: primaryTextColor }]}>
                {displayName}
              </Text>
              {!isOwnProfile ? (
                <Pressable
                  style={[
                    profile.viewerFollows ? styles.inlineSecondaryButton : styles.inlineFollowButton,
                    profile.viewerFollows
                      ? { backgroundColor: "transparent", borderColor }
                      : { backgroundColor: accentColor },
                  ]}
                  onPress={handleFollow}
                >
                  <Text
                    style={[
                      profile.viewerFollows
                        ? styles.inlineSecondaryButtonText
                        : styles.inlineFollowButtonText,
                      profile.viewerFollows
                        ? { color: primaryTextColor }
                        : { color: "#fff" },
                    ]}
                  >
                    {profile.viewerFollows ? "Unfollow" : "Follow"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.username, { color: mutedTextColor }]}>
              @{profile.username}
            </Text>
            {profile.bio ? (
              <Text style={[styles.bio, { color: primaryTextColor }]}>{profile.bio}</Text>
            ) : null}
            {profile.location ? (
              <Text style={[styles.location, { color: mutedTextColor }]}>
                {profile.location}
              </Text>
            ) : null}
            <View style={styles.countRow}>
              <Pressable
                style={[styles.countButton, { backgroundColor: Colors[theme].surface, borderColor }]}
                onPress={() =>
                  router.push({
                    pathname: "/user/[username]/[kind]",
                    params: { username: profile.username, kind: "followers" },
                  })
                }
              >
                <Text style={[styles.countText, { color: primaryTextColor }]}>
                  {profile.followerCount} followers
                </Text>
              </Pressable>
              <Pressable
                style={[styles.countButton, { backgroundColor: Colors[theme].surface, borderColor }]}
                onPress={() =>
                  router.push({
                    pathname: "/user/[username]/[kind]",
                    params: { username: profile.username, kind: "following" },
                  })
                }
              >
                <Text style={[styles.countText, { color: primaryTextColor }]}>
                  {profile.followingCount} following
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
