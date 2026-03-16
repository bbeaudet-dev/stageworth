import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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
