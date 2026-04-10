import { StyleSheet, View } from "react-native";

import { BrandGradientTitle } from "@/components/BrandGradientTitle";

export function MyShowsHeader() {
  return (
    <View style={styles.bar}>
      <BrandGradientTitle text="My Shows" fontSize={28} />
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
});
