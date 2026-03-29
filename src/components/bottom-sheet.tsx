import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Animated bottom sheet: backdrop fades in independently while the sheet
 * slides up from the bottom, giving a clean native-feeling presentation.
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(700)).current;
  // Keep the Modal mounted during the exit animation.
  const [mountVisible, setMountVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setMountVisible(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 700,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMountVisible(false);
      });
    }
  }, [visible, backdropAnim, slideAnim]);

  return (
    <Modal
      visible={mountVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Fading backdrop — separate from the sliding sheet */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sliding sheet — pointerEvents box-none lets touches through to the backdrop above the sheet */}
        <Animated.View
          style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }], pointerEvents: "box-none" }]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
