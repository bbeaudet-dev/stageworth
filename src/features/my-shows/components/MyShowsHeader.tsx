import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { BrandGradientTitle } from "@/components/BrandGradientTitle";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function MyShowsHeader() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const accent = Colors[colorScheme ?? "light"].accent;

  return (
    <View style={styles.bar}>
      <BrandGradientTitle text="My Shows" fontSize={28} />
      <Pressable
        onPress={() => router.push("/add-visit")}
        hitSlop={10}
        style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <IconSymbol name="plus.circle.fill" size={28} color={accent} />
      </Pressable>
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
  addBtn: {
    padding: 2,
  },
});
