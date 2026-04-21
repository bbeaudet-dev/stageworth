import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

/**
 * Plan-tab quick-action row. Mirrors the shape of the Search tab's row so the
 * two top-of-screen action surfaces feel consistent. "Help Me Decide" is
 * scaffolded here but will be wired to the compare-shows action in Phase 3.
 */
export function PlanActionRow() {
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const handleHelpMeDecide = () => {
    // TODO(phase-3): open HelpMeDecideSheet with the user's "Want to See" list
    Alert.alert("Coming soon", "Help Me Decide is on the way — you'll be able to compare a few shows and get a pick.");
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push("/find-show")}
        style={[
          styles.action,
          { backgroundColor: c.surfaceElevated, borderColor: c.border },
        ]}
      >
        <IconSymbol name="sparkles" size={16} color={c.accent} />
        <Text style={[styles.actionText, { color: c.text }]}>Find a Show</Text>
      </Pressable>
      <Pressable
        onPress={handleHelpMeDecide}
        style={[
          styles.action,
          { backgroundColor: c.surfaceElevated, borderColor: c.border },
        ]}
      >
        <IconSymbol name="questionmark.circle" size={16} color={c.accent} />
        <Text style={[styles.actionText, { color: c.text }]}>Help Me Decide</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: 13, fontWeight: "600" },
});
