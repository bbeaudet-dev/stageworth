import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const sheetBackground = Colors[theme].background;
  const optionBackground = theme === "dark" ? "#202024" : "#f8f8ff";
  const optionBorder = theme === "dark" ? "#333" : "#e1e1e1";
  const optionTextColor = Colors[theme].text;
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          style={[styles.backdrop, { bottom: tabBarHeight }]}
          onPress={onClose}
        />
        <View
          style={[styles.menuAnchor, { paddingBottom: tabBarHeight + 8 }]}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, { backgroundColor: sheetBackground }]}>
            <Pressable
              style={[styles.optionButton, { backgroundColor: optionBackground, borderColor: optionBorder }]}
              onPress={onAddVisit}
            >
              <Text style={[styles.optionTitle, { color: optionTextColor }]}>Add a Visit</Text>
            </Pressable>
            <Pressable
              style={[styles.optionButton, { backgroundColor: optionBackground, borderColor: optionBorder }]}
              onPress={onCreateList}
            >
              <Text style={[styles.optionTitle, { color: optionTextColor }]}>Create a List</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menuAnchor: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
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
