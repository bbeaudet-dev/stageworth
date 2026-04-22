import { Text, TextInput, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

export function NotesSection({
  notes,
  setNotes,
}: {
  notes: string;
  setNotes: (value: string) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholderTextColor={c.mutedText}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any extra details..."
        multiline
      />
      <Text style={[styles.hintText, { color: c.mutedText }]}>
        Tip: wrap text in ||pipes|| to mark it as a spoiler.
      </Text>
    </View>
  );
}
