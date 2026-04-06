import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastConfig = {
  message: string;
  icon?: string;
  duration?: number;
};

type ToastContextType = {
  showToast: (config: ToastConfig) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentMessage, setCurrentMessage] = useState<{ text: string; icon?: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 14, duration: 220, useNativeDriver: true }),
    ]).start(() => setCurrentMessage(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    ({ message, icon, duration = 2500 }: ToastConfig) => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      opacity.setValue(0);
      translateY.setValue(14);
      setCurrentMessage({ text: message, icon });

      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          tension: 240,
          friction: 18,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 240,
          friction: 18,
          useNativeDriver: true,
        }),
      ]).start();

      dismissTimerRef.current = setTimeout(dismiss, duration);
    },
    [dismiss, opacity, translateY]
  );

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // 76pt above safe area bottom clears the floating tab bar on all devices
  const bottomOffset = Math.max(insets.bottom + 76, 100);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {currentMessage !== null && (
        <Animated.View
          style={[
            styles.toast,
            { bottom: bottomOffset, opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.icon}>{currentMessage.icon ?? "✓"}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {currentMessage.text}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "rgba(18,18,18,0.93)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5AC87A",
  },
  message: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
});
