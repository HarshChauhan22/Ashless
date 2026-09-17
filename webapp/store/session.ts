"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  userId: string | null;
  phoneNumber: string | null;
  setSession: (userId: string, phoneNumber: string) => void;
  logout: () => void;
}

// Client only ever stores an opaque id — see lib/auth.ts's note on why this
// isn't real token-based auth yet.
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      phoneNumber: null,
      setSession: (userId, phoneNumber) => set({ userId, phoneNumber }),
      logout: () => set({ userId: null, phoneNumber: null }),
    }),
    { name: "ashless-session" }
  )
);
