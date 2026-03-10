import { useQuery } from "convex/react";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { getProductionStatus } from "@/utils/productions";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Running", color: "#166534", bg: "#dcfce7" },
  in_previews: { label: "Previews", color: "#1e40af", bg: "#dbeafe" },
  announced: { label: "Announced", color: "#92400e", bg: "#fef3c7" },
  closed: { label: "Closed", color: "#6b7280", bg: "#f3f4f6" },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ProductionCard({ production }: { production: any }) {
  const status = getProductionStatus(production);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.closed;
  const show = production.show;

  const startDate = production.previewDate ?? production.openingDate;
  const dateRange = startDate
    ? production.closingDate
      ? `${formatDate(startDate)} – ${formatDate(production.closingDate)}`
      : `From ${formatDate(startDate)}`
    : null;

  const closingWarning = (() => {
    if (!production.closingDate || status === "closed") return null;
    const d = daysUntil(production.closingDate);
    if (d > 30) return null;
    return d <= 0 ? "Closing today" : `Closes in ${d}d`;
  })();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.showName} numberOfLines={1}>
            {show?.name ?? "Unknown Show"}
          </Text>
          <Text style={styles.theatre} numberOfLines={1}>
            {production.theatre}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>
      {(dateRange || closingWarning) && (
        <View style={styles.cardFooter}>
          {dateRange && <Text style={styles.dateRange}>{dateRange}</Text>}
          {closingWarning && (
            <View style={styles.closingPill}>
              <Text style={styles.closingText}>{closingWarning}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function BrowseScreen() {
  const [search, setSearch] = useState("");
  const allProductions = useQuery(api.productions.listAll);

  const today = new Date().toISOString().split("T")[0];

  const visible = (allProductions ?? []).filter((p: any) => {
    const status = getProductionStatus(p, today);
    if (status === "closed") return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.show?.name?.toLowerCase().includes(q) ||
      p.theatre?.toLowerCase().includes(q)
    );
  });

  const sections: { title: string; data: any[] }[] = [
    {
      title: "Now Running",
      data: visible.filter((p: any) => getProductionStatus(p, today) === "open"),
    },
    {
      title: "In Previews",
      data: visible.filter(
        (p: any) => getProductionStatus(p, today) === "in_previews"
      ),
    },
    {
      title: "Announced",
      data: visible.filter(
        (p: any) => getProductionStatus(p, today) === "announced"
      ),
    },
  ].filter((s) => s.data.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search shows or theatres…"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {allProductions === undefined ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : sections.length === 0 ? (
          <Text style={styles.empty}>
            {search ? "No results." : "No current productions yet."}
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {section.data.map((production: any) => (
                <ProductionCard key={production._id} production={production} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  empty: {
    color: "#aaa",
    fontSize: 15,
    textAlign: "center",
    marginTop: 48,
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitles: { flex: 1, gap: 3 },
  showName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  theatre: {
    fontSize: 13,
    color: "#666",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRange: {
    fontSize: 12,
    color: "#888",
  },
  closingPill: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  closingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b91c1c",
  },
});
