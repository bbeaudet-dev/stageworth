import { Pressable, Text, View } from "react-native";

import { styles } from "@/features/profile/styles";

export function AccountSection({
  email,
  name,
  onSignOut,
}: {
  email: string;
  name?: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <View style={styles.info}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{email}</Text>
        {name ? <Text style={styles.name}>{name}</Text> : null}
      </View>

      <Pressable style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </>
  );
}
