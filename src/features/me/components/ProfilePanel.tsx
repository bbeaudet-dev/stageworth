import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient } from "@/lib/auth-client";

interface ProfilePanelProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfilePanel({ visible, onClose }: ProfilePanelProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const myProfile = useQuery(api.profiles.getMyProfile);
  const removePushToken = useMutation(api.notifications.removePushToken);

  const backgroundColor = Colors[theme].background;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const dangerColor = Colors[theme].danger;

  const displayName = myProfile?.name?.trim() || myProfile?.username || "You";
  const username = myProfile?.username ?? "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("");

  const handleSignOut = async () => {
    await removePushToken().catch(() => {});
    await authClient.signOut();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View
        style={[
          styles.sheet,
          { backgroundColor, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: borderColor }]} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { backgroundColor: surfaceColor, borderColor }]}>
            {myProfile?.avatarUrl ? (
              <Image source={{ uri: myProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: accentColor + "22" }]}>
                <Text style={[styles.avatarFallbackText, { color: accentColor }]}>
                  {initials || "U"}
                </Text>
              </View>
            )}
            <Text style={[styles.displayName, { color: primaryTextColor }]}>
              {displayName}
            </Text>
            {username ? (
              <Text style={[styles.username, { color: mutedTextColor }]}>@{username}</Text>
            ) : null}
            <View style={styles.countsRow}>
              <Pressable
                disabled={!username}
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/user/[username]/[kind]", params: { username, kind: "followers" } });
                }}
              >
                <Text style={[styles.countText, { color: mutedTextColor }]}>
                  <Text style={[styles.countNumber, { color: primaryTextColor }]}>
                    {myProfile?.followerCount ?? 0}
                  </Text>
                  {" followers"}
                </Text>
              </Pressable>
              <Pressable
                disabled={!username}
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/user/[username]/[kind]", params: { username, kind: "following" } });
                }}
              >
                <Text style={[styles.countText, { color: mutedTextColor }]}>
                  <Text style={[styles.countNumber, { color: primaryTextColor }]}>
                    {myProfile?.followingCount ?? 0}
                  </Text>
                  {" following"}
                </Text>
              </Pressable>
            </View>
            {myProfile?.bio ? (
              <Text style={[styles.bio, { color: primaryTextColor }]}>{myProfile.bio}</Text>
            ) : null}
            {myProfile?.location ? (
              <Text style={[styles.location, { color: mutedTextColor }]}>{myProfile.location}</Text>
            ) : null}
          </View>

          <Pressable
            style={[styles.signOutButton, { backgroundColor: dangerColor }]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
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
  content: { padding: 16, gap: 12 },
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
  signOutButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  signOutText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
