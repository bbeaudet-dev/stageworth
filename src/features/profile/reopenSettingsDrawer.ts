import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";

/** Set when navigating from the profile settings drawer to a stack settings screen. */
let reopenAfterSettingsScreen = false;

const listeners = new Set<() => void>();

export function markReopenSettingsDrawerAfterPop() {
  reopenAfterSettingsScreen = true;
}

export function subscribeProfileDrawerReopen(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** When the user leaves a settings stack screen (back), opens the drawer if they came from it. */
export function notifyReopenProfileDrawerIfMarked() {
  if (!reopenAfterSettingsScreen) return;
  reopenAfterSettingsScreen = false;
  listeners.forEach((cb) => cb());
}

/**
 * Use on Edit Profile, Theatre Preferences, and Notification Preferences.
 * Uses `beforeRemove` (not effect cleanup) so React Strict Mode remounts do not open the drawer early.
 */
export function useNotifyProfileDrawerReopenOnUnmount() {
  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      notifyReopenProfileDrawerIfMarked();
    });
  }, [navigation]);
}
