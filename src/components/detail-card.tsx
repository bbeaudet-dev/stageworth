import { Children, isValidElement, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  return (
    <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
      <Text style={[styles.heading, { color: c.mutedText }]}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Groups multiple `DetailRow` children under a single shared border. Use for
 * tightly related facts (e.g. location, dates) so they read as one grouped
 * record instead of a wall of cards.
 */
export function DetailGroup({ children }: { children: ReactNode }) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const rows = Children.toArray(children).filter(isValidElement);
  if (rows.length === 0) return null;
  return (
    <View
      style={[styles.group, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
    >
      {rows}
    </View>
  );
}

export function DetailRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  return (
    <View style={styles.row}>
      <Text style={[styles.heading, { color: c.mutedText }]}>{title}</Text>
      {children}
    </View>
  );
}

export const detailCardStyles = StyleSheet.create({
  value: { fontSize: 18, fontWeight: "700" },
  subtle: { fontSize: 13, lineHeight: 18 },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  group: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  heading: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
});
