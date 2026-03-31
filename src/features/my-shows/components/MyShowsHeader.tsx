import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function MyShowsHeader() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const titleColor = Colors[theme].text;

  return (
    <View style={styles.bar}>
      <Text style={[styles.title, { color: titleColor }]}>My Shows</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
});
