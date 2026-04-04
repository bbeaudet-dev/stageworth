import { StyleSheet } from "react-native";

/** Letterbox/pillarbox fill behind playbill images when using contentFit "contain". */
export function playbillMatBackground(theme: "light" | "dark"): string {
  return theme === "dark" ? "#1a1a2e" : "#f0f0f4";
}

export const styles = StyleSheet.create({
  container: { flex: 1 },
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
    fontSize: 15,
  },
  clearSearchButton: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 16,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  countText: {
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  empty: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 48,
  },
  loadMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  gridPlaceholder: {
    flex: 1,
  },
  playbillCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  playbillImage: {
    width: "100%",
    aspectRatio: 2 / 3,
  },
  playbillFallback: {
    width: "100%",
    aspectRatio: 2 / 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  playbillFallbackText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  playbillInfo: {
    padding: 5,
    gap: 3,
  },
  playbillShowName: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  playbillBadgeRow: {
    flexDirection: "row",
    gap: 3,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  closingPill: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  closingText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b91c1c",
  },
});
