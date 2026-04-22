import { Text, TextInput, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

export function SeatSection({
  seat,
  setSeat,
}: {
  seat: string;
  setSeat: (value: string) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Seat</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
        ]}
        placeholderTextColor={c.mutedText}
        value={seat}
        onChangeText={setSeat}
        placeholder="e.g. Orchestra, Row J, Seat 105"
        autoCapitalize="words"
      />
    </View>
  );
}
