import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface UserProfilePanelProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users"> | null;
}

export function UserProfilePanel({ visible, onClose, userId }: UserProfilePanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;

  const profile = useQuery(
    api.social.profiles.getPublicProfileByUserId,
    userId ? { userId } : "skip"
  );

  const followUser = useMutation(api.social.social.followUser);
  const unfollowUser = useMutation(api.social.social.unfollowUser);

  const initials = (() => {
    const source = profile?.name?.trim() || profile?.username || "?";
    const parts = source.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  })();

  const handleFollowToggle = async () => {
    if (!profile) return;
    if (profile.viewerFollows) {
      await unfollowUser({ userId: profile._id });
    } else {
      await followUser({ userId: profile._id });
    }
  };

  const handleViewFullProfile = () => {
    if (!profile?.username) return;
    onClose();
    router.push({
      pathname: "/user/[username]",
      params: { username: profile.username },
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {profile === undefined ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : profile === null ? (
          <View style={styles.loading}>
            <Text style={[styles.errorText, { color: mutedTextColor }]}>User not found.</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: surfaceColor, borderColor }]}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: accentColor + "22" }]}>
                  <Text style={[styles.avatarFallbackText, { color: accentColor }]}>{initials}</Text>
                </View>
              )}

              {profile.name ? (
                <Text style={[styles.displayName, { color: primaryTextColor }]}>{profile.name}</Text>
              ) : null}
              {profile.username ? (
                <Text style={[styles.username, { color: mutedTextColor }]}>@{profile.username}</Text>
              ) : null}

              <View style={styles.countsRow}>
                <Pressable
                  onPress={() => {
                    if (!profile.username) return;
                    onClose();
                    router.push({ pathname: "/user/[username]/[kind]", params: { username: profile.username, kind: "followers" } });
                  }}
                >
                  <Text style={[styles.countText, { color: mutedTextColor }]}>
                    <Text style={[styles.countNumber, { color: primaryTextColor }]}>{profile.followerCount}</Text>
                    {" followers"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!profile.username) return;
                    onClose();
                    router.push({ pathname: "/user/[username]/[kind]", params: { username: profile.username, kind: "following" } });
                  }}
                >
                  <Text style={[styles.countText, { color: mutedTextColor }]}>
                    <Text style={[styles.countNumber, { color: primaryTextColor }]}>{profile.followingCount}</Text>
                    {" following"}
                  </Text>
                </Pressable>
              </View>

              {profile.bio ? (
                <Text style={[styles.bio, { color: primaryTextColor }]}>{profile.bio}</Text>
              ) : null}
              {profile.location ? (
                <Text style={[styles.location, { color: mutedTextColor }]}>{profile.location}</Text>
              ) : null}
            </View>

            {/* Actions */}
            {!profile.viewerIsSelf ? (
              <Pressable
                style={[
                  styles.followBtn,
                  profile.viewerFollows
                    ? { backgroundColor: surfaceColor, borderWidth: StyleSheet.hairlineWidth, borderColor }
                    : { backgroundColor: accentColor },
                ]}
                onPress={handleFollowToggle}
              >
                <Text style={[styles.followBtnText, { color: profile.viewerFollows ? primaryTextColor : onAccent }]}>
                  {profile.viewerFollows ? "Following" : "Follow"}
                </Text>
              </Pressable>
            ) : null}

            <Pressable style={[styles.viewProfileBtn, { borderColor }]} onPress={handleViewFullProfile}>
              <Text style={[styles.viewProfileText, { color: accentColor }]}>View Full Profile</Text>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: { fontSize: 14 },
  content: {
    padding: 16,
    gap: 12,
  },
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 6,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { fontSize: 26, fontWeight: "700" },
  displayName: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  username: { fontSize: 14, fontWeight: "600" },
  countsRow: { flexDirection: "row", gap: 16, marginTop: 4 },
  countText: { fontSize: 13, fontWeight: "500" },
  countNumber: { fontWeight: "700" },
  bio: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 2 },
  location: { fontSize: 13 },
  followBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  followBtnText: { fontSize: 15, fontWeight: "700" },
  viewProfileBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewProfileText: { fontSize: 15, fontWeight: "600" },
});
