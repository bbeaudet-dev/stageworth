import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { SettingsDrawer } from "@/features/profile/components/SettingsDrawer";

type ProfileSettingsDrawerContextValue = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const ProfileSettingsDrawerContext = createContext<ProfileSettingsDrawerContextValue | null>(null);

/** Renders the profile settings drawer at the root so the Modal stacks above pushed routes. */
export function ProfileSettingsDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openDrawer = useCallback(() => setVisible(true), []);
  const closeDrawer = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ openDrawer, closeDrawer }),
    [openDrawer, closeDrawer]
  );

  return (
    <ProfileSettingsDrawerContext.Provider value={value}>
      {children}
      <SettingsDrawer visible={visible} onClose={closeDrawer} />
    </ProfileSettingsDrawerContext.Provider>
  );
}

export function useProfileSettingsDrawer(): ProfileSettingsDrawerContextValue {
  const ctx = useContext(ProfileSettingsDrawerContext);
  if (!ctx) {
    throw new Error("useProfileSettingsDrawer must be used within ProfileSettingsDrawerProvider");
  }
  return ctx;
}
