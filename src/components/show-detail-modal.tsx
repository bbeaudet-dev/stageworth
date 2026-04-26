import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ShowDetailModalProps {
  showId: Id<"shows"> | null;
  showName: string;
  rank: number | null;
  rankedCount: number;
  onViewShowDetails: () => void;
  onClose: () => void;
}

export function ShowDetailModal({
  showId,
  showName,
  rank,
  rankedCount,
  onViewShowDetails,
  onClose,
}: ShowDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].surfaceElevated;
  const headerBorder = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;

  return (
    <Modal
      visible={showId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor }]}>
          <View style={[styles.header, { borderBottomColor: headerBorder }]}>
            <Text style={[styles.rank, { color: mutedTextColor }]}>
              {rank === null ? "Unranked" : `#${rank} / ${rankedCount}`}
            </Text>
            <Text style={[styles.title, { color: primaryTextColor }]} numberOfLines={2}>
              {showName}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: mutedTextColor }]}>✕</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.viewDetailsRow, { borderBottomColor: headerBorder }]}
            onPress={onViewShowDetails}
          >
            <Text style={[styles.viewDetailsText, { color: accentColor }]}>
              View Show Details
            </Text>
          </Pressable>
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
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: {
    fontSize: 15,
    fontWeight: "bold",
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
  },
  viewDetailsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
