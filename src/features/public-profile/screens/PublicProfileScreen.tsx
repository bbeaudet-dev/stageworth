import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { styles } from "@/features/public-profile/styles";

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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: displayName,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {profile === undefined ? <Text style={styles.loading}>Loading profile...</Text> : null}
        {profile === null ? <Text style={styles.loading}>User not found.</Text> : null}
        {profile ? (
          <View style={styles.card}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{displayName}</Text>
              {!isOwnProfile ? (
                <Pressable
                  style={profile.viewerFollows ? styles.inlineSecondaryButton : styles.inlineFollowButton}
                  onPress={handleFollow}
                >
                  <Text
                    style={profile.viewerFollows ? styles.inlineSecondaryButtonText : styles.inlineFollowButtonText}
                  >
                    {profile.viewerFollows ? "Unfollow" : "Follow"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            {profile.location ? <Text style={styles.location}>{profile.location}</Text> : null}
            <View style={styles.countRow}>
              <Pressable
                style={styles.countButton}
                onPress={() =>
                  router.push({
                    pathname: "/user/[username]/[kind]",
                    params: { username: profile.username, kind: "followers" },
                  })
                }
              >
                <Text style={styles.countText}>{profile.followerCount} followers</Text>
              </Pressable>
              <Pressable
                style={styles.countButton}
                onPress={() =>
                  router.push({
                    pathname: "/user/[username]/[kind]",
                    params: { username: profile.username, kind: "following" },
                  })
                }
              >
                <Text style={styles.countText}>{profile.followingCount} following</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
