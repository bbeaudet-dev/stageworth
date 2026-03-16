import { Pressable, Text } from "react-native";

import { styles } from "@/features/add-visit/styles";

export function SaveVisitButton({
  isSaving,
  onSave,
}: {
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <Pressable
      style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
      onPress={onSave}
      disabled={isSaving}
    >
      <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Visit"}</Text>
    </Pressable>
  );
}
