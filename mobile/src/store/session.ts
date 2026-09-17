import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SessionState {
  userId: string | null;
  phoneNumber: string | null;
  accessToken: string | null;
  onboardingComplete: boolean;
  hydrated: boolean;
  setSession: (userId: string, phoneNumber: string, accessToken: string, onboardingComplete: boolean) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      phoneNumber: null,
      accessToken: null,
      onboardingComplete: false,
      hydrated: false,
      setSession: (userId, phoneNumber, accessToken, onboardingComplete) => set({ userId, phoneNumber, accessToken, onboardingComplete }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      logout: () => set({ userId: null, phoneNumber: null, accessToken: null, onboardingComplete: false }),
    }),
    {
      name: "ashless-session",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
