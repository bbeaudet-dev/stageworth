import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    marginBottom: 4,
  },
  profileAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarFallbackText: {
    fontSize: 28,
    fontWeight: "700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    flexShrink: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
  },
  countRow: {
    flexDirection: "row",
    gap: 10,
  },
  countButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
  },
  followButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  followButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  inlineFollowButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineFollowButtonText: {
    fontWeight: "700",
    fontSize: 12,
  },
  inlineSecondaryButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSecondaryButtonText: {
    fontWeight: "700",
    fontSize: 12,
  },
  listRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loading: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 30,
  },
});
