import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Id } from "@/convex/_generated/dataModel";
import { VisitsList } from "@/components/show-row-accordion";

interface ShowDetailModalProps {
  showId: Id<"shows"> | null;
  showName: string;
  rank: number | null;
  rankedCount: number;
  onClose: () => void;
}

export function ShowDetailModal({
  showId,
  showName,
  rank,
  rankedCount,
  onClose,
}: ShowDetailModalProps) {
  return (
    <Modal
      visible={showId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.rank}>
              {rank === null ? "Unranked" : `#${rank} / ${rankedCount}`}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {showName}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          {showId && <VisitsList showId={showId} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  rank: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
  },
  closeBtn: {
    marginLeft: 12,
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: "#999",
  },
});
