import { Pressable, Text } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

export function SaveVisitButton({
  isSaving,
  onSave,
}: {
  isSaving: boolean;
  onSave: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const accent = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  return (
    <Pressable
      style={[styles.saveButton, { backgroundColor: accent }, isSaving && styles.saveButtonDisabled]}
      onPress={onSave}
      disabled={isSaving}
    >
      <Text style={[styles.saveButtonText, { color: onAccent }]}>{isSaving ? "Saving..." : "Save Visit"}</Text>
    </Pressable>
  );
}
