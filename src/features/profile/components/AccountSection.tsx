import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { styles } from "@/features/profile/styles";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function AccountSection({
  email,
  username,
  onSignOut,
  isSigningOut = false,
}: {
  email: string;
  username?: string;
  onSignOut: () => void;
  isSigningOut?: boolean;
}) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const dangerColor = Colors[theme].danger;

  return (
    <>
      <View style={[styles.info, { backgroundColor: surfaceColor }]}>
        <Text style={[styles.label, { color: mutedTextColor }]}>Signed in as</Text>
        {username ? <Text style={[styles.email, { color: primaryTextColor }]}>@{username}</Text> : null}
        <Text style={[styles.name, { color: mutedTextColor }]}>{email}</Text>
      </View>

      <Pressable
        style={[
          styles.signOutButton,
          { backgroundColor: dangerColor },
          isSigningOut && styles.disabledButton,
        ]}
        onPress={onSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.signOutText, { color: "#fff" }]}>Sign Out</Text>
        )}
      </Pressable>
    </>
  );
}
