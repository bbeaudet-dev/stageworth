import { Text, TextInput, View } from "react-native";

import { styles } from "@/features/add-visit/styles";

export function VisitDateSection({
  date,
  setDate,
}: {
  date: string;
  setDate: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Visit Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
