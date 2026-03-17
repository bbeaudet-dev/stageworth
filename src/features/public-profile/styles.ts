import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    padding: 14,
    gap: 8,
    backgroundColor: "#fff",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  username: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  bio: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
    color: "#666",
  },
  countRow: {
    flexDirection: "row",
    gap: 10,
  },
  countButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d5d5d5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fbfbfb",
  },
  countText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  followButton: {
    borderRadius: 10,
    backgroundColor: "#1f1f1f",
    paddingVertical: 10,
    alignItems: "center",
  },
  followButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#222",
    fontWeight: "700",
    fontSize: 14,
  },
  listRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  loading: {
    fontSize: 15,
    color: "#7a7a7a",
    textAlign: "center",
    marginTop: 30,
  },
});
