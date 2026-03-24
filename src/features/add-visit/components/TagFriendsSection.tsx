import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Id } from "@/convex/_generated/dataModel";

type FollowingUser = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
};

type Props = {
  following: FollowingUser[];
  taggedUserIds: Id<"users">[];
  onToggle: (userId: Id<"users">) => void;
};

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function TagFriendsSection({ following, taggedUserIds, onToggle }: Props) {
  const theme = useColorScheme() ?? "light";
  const text = Colors[theme].text;
  const mutedText = theme === "dark" ? "#a0a4aa" : "#666";
  const sectionLabel = theme === "dark" ? "#a0a4aa" : "#666";
  const accentColor = Colors[theme].accent;
  const chipBg = theme === "dark" ? "#27272f" : "#f2f2f7";
  const chipBgSelected = accentColor;
  const chipBorder = theme === "dark" ? "#3a3a44" : "#e0e0e0";
  const avatarFallbackBg = theme === "dark" ? "#3a3a50" : "#d4d4f0";

  if (following.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { color: sectionLabel }]}>Tag friends</Text>
        <Text style={[styles.emptyText, { color: mutedText }]}>
          Follow people to tag them in your visits.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: sectionLabel }]}>Tag friends</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {following.map((user) => {
          const isSelected = taggedUserIds.includes(user._id);
          return (
            <Pressable
              key={user._id}
              onPress={() => onToggle(user._id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? chipBgSelected : chipBg,
                  borderColor: isSelected ? chipBgSelected : chipBorder,
                },
              ]}
            >
              <View style={styles.chipInner}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={[
                      styles.avatar,
                      isSelected && styles.avatarSelected,
                    ]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : avatarFallbackBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarFallbackText,
                        { color: isSelected ? "#fff" : accentColor },
                      ]}
                    >
                      {getInitials(user.name, user.username)}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.chipName,
                    { color: isSelected ? "#fff" : text },
                  ]}
                  numberOfLines={1}
                >
                  {user.name?.split(" ")[0] ?? user.username}
                </Text>
                {isSelected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    paddingTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },
  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarSelected: {
    opacity: 0.9,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 9,
    fontWeight: "700",
  },
  chipName: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 80,
  },
  checkmark: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
});
