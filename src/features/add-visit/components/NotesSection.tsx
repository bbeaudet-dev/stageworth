import { Text, TextInput, View } from "react-native";

import { styles } from "@/features/add-visit/styles";

export function NotesSection({
  notes,
  setNotes,
}: {
  notes: string;
  setNotes: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any extra details..."
        multiline
      />
    </View>
  );
}
