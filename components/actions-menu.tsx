import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onAddVisit: () => void;
  onCreateList: () => void;
}

export function ActionsMenu({
  visible,
  onClose,
  onAddVisit,
  onCreateList,
}: ActionsMenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menuAnchor} pointerEvents="box-none">
        <View style={styles.sheet}>
          <Pressable style={styles.optionButton} onPress={onAddVisit}>
            <Text style={styles.optionTitle}>Add a Visit</Text>
          </Pressable>
          <Pressable style={styles.optionButton} onPress={onCreateList}>
            <Text style={styles.optionTitle}>Create a List</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 78,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menuAnchor: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 84,
  },
  sheet: {
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  optionButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e1e1",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8ff",
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
});
