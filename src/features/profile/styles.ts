import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  info: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
  },
  name: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e2e2",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: "#fbfbfb",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1f1f",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d3d3d3",
    backgroundColor: "#fff",
  },
  inlineCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  inlineCreateButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
  },
  listRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1f1f",
  },
  listMeta: {
    fontSize: 12,
    color: "#767676",
  },
  listInfo: {
    flex: 1,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  errorText: {
    color: "#cc2a2a",
    fontSize: 13,
    lineHeight: 18,
  },
  signOutButton: {
    padding: 14,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    alignItems: "center",
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
