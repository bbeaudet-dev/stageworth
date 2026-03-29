import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

/**
 * Top bar for the Me tab.
 * Avatar button opens the profile panel; settings icon goes directly to Account Settings.
 */
export function MyShowsHeader({
  onProfilePress,
  avatarUrl,
  initials,
}: {
  onProfilePress?: () => void;
  avatarUrl?: string | null;
  initials?: string;
}) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const titleColor = Colors[theme].text;
  const mutedColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const avatarBg = theme === "dark" ? "#2a2a2f" : "#ececef";

  return (
    <View style={styles.bar}>
      <Text style={[styles.title, { color: titleColor }]}>My Shows</Text>

      <View style={styles.right}>
        {onProfilePress ? (
          <Pressable
            style={[styles.avatarButton, { backgroundColor: avatarBg }]}
            onPress={onProfilePress}
            hitSlop={8}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: accentColor }]}>
                {initials || "?"}
              </Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push("/account-settings")}
          hitSlop={10}
          style={styles.settingsBtn}
        >
          <IconSymbol name="gearshape.fill" size={22} color={mutedColor} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
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
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "700",
  },
  settingsBtn: {
    padding: 2,
  },
});
