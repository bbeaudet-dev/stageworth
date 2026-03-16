import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

export const detailCardStyles = StyleSheet.create({
  value: { fontSize: 18, color: "#222", fontWeight: "700" },
  subtle: { fontSize: 13, color: "#666", lineHeight: 18 },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    gap: 4,
  },
  heading: { fontSize: 12, color: "#777", textTransform: "uppercase", letterSpacing: 0.4 },
});
