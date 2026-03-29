import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ProfileSectionProps {
  displayName: string;
  username: string;
  initials: string;
  avatarUrl?: string | null;
  followerCount?: number;
  followingCount?: number;
  bio?: string | null;
  location?: string | null;
}

export function ProfileSection({
  displayName,
  username,
  initials,
  avatarUrl,
  followerCount = 0,
  followingCount = 0,
  bio,
  location,
}: ProfileSectionProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  return (
    <View style={styles.container}>
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: accentColor + "22" }]}>
              <Text style={[styles.avatarInitials, { color: accentColor }]}>
                {initials || "?"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsCol}>
          <Pressable
            style={styles.statBlock}
            disabled={!username}
            onPress={() =>
              router.push({ pathname: "/user/[username]/[kind]", params: { username, kind: "followers" } })
            }
          >
            <Text style={[styles.statNumber, { color: primaryTextColor }]}>{followerCount}</Text>
            <Text style={[styles.statLabel, { color: mutedTextColor }]}>Followers</Text>
          </Pressable>
          <Pressable
            style={styles.statBlock}
            disabled={!username}
            onPress={() =>
              router.push({ pathname: "/user/[username]/[kind]", params: { username, kind: "following" } })
            }
          >
            <Text style={[styles.statNumber, { color: primaryTextColor }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: mutedTextColor }]}>Following</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.displayName, { color: primaryTextColor }]} numberOfLines={1}>
        {displayName}
      </Text>
      {username ? (
        <Text style={[styles.username, { color: mutedTextColor }]}>@{username}</Text>
      ) : null}
      {bio ? (
        <Text style={[styles.bio, { color: primaryTextColor }]}>{bio}</Text>
      ) : null}
      {location ? (
        <Text style={[styles.location, { color: mutedTextColor }]}>{location}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 24,
  },
  avatarWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "700",
  },
  statsCol: {
    flexDirection: "row",
    gap: 20,
  },
  statBlock: {
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    fontSize: 20,
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
  username: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: -2,
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
});
