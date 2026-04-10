import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

export type UserCardUser = {
  _id: string;
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
};

type UserCardProps = {
  user: UserCardUser;
  width?: number;
  onPress: () => void;
};

export function UserCard({ user, width = 80, onPress }: UserCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const surface = Colors[theme].surfaceElevated;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;

  const displayName = user.name?.trim() || user.username;

  return (
    <Pressable
      style={[styles.card, { width, backgroundColor: surface }]}
      onPress={onPress}
    >
      <View style={[styles.avatarWrapper, { backgroundColor: accent + "22" }]}>
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.initials, { color: accent }]}>
            {getInitials(user.name, user.username)}
          </Text>
        )}
      </View>
      <Text
        style={[styles.name, { color: text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {displayName}
      </Text>
      <Text style={[styles.handle, { color: muted }]} numberOfLines={1}>
        @{user.username}
      </Text>
    </Pressable>
  );
}

const AVATAR_SIZE = 54;

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 5,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 17,
    fontWeight: "700",
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 15,
    minHeight: 30,
    width: "100%",
  },
  handle: {
    fontSize: 10,
    textAlign: "center",
  },
});
