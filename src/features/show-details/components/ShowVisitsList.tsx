import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/features/browse/logic/date";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Visit {
  _id: Id<"visits">;
  date: string;
}

interface ShowVisitsListProps {
  visits: Visit[] | undefined;
}

export function ShowVisitsList({ visits }: ShowVisitsListProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const hasVisits = !!visits && visits.length > 0;

  if (!hasVisits) return null;

  return (
    <View style={[styles.section, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
      <Text style={[styles.sectionTitle, { color: c.mutedText }]}>Your Visits</Text>
      {visits!.map((visit) => (
        <Pressable
          key={visit._id}
          style={[styles.row, { borderTopColor: c.border }]}
          onPress={() => router.push({ pathname: "/visit/[visitId]", params: { visitId: String(visit._id) } })}
        >
          <Text style={[styles.rowText, { color: c.text }]}>{formatDate(visit.date)}</Text>
          <Text style={[styles.rowChevron, { color: c.mutedText }]}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11 },
  rowText: { fontSize: 14, fontWeight: "500" },
  rowChevron: { fontSize: 18, fontWeight: "300" },
});
