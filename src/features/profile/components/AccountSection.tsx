import { Pressable, Text, View } from "react-native";

import { styles } from "@/features/profile/styles";

export function AccountSection({
  email,
  username,
  onSignOut,
}: {
  email: string;
  username?: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <View style={styles.info}>
        <Text style={styles.label}>Signed in as</Text>
        {username ? <Text style={styles.email}>@{username}</Text> : null}
        <Text style={styles.name}>{email}</Text>
      </View>

      <Pressable style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </>
  );
}
