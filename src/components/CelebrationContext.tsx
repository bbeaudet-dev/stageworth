import { createContext, useContext } from "react";

export interface CelebrationData {
  showName: string;
  imageUrl: string | null;
}

interface CelebrationContextValue {
  celebrate: (data: CelebrationData) => void;
}

export const CelebrationContext = createContext<CelebrationContextValue>({
  celebrate: () => {},
});

export function useCelebration() {
  return useContext(CelebrationContext);
}
