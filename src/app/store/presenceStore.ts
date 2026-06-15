// src/app/store/presenceStore.ts
import { create } from 'zustand';

interface PresenceState {
  // Теперь это объект { "id-юзера": true, "id-другого": true }
  onlineUsers: Record<string, boolean>;
  setOnlineUsers: (users: Record<string, boolean>) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: {},
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));

export const useIsOnline = (userId?: string | null) => {
  return usePresenceStore((state) => {
    if (!userId) return false;
    return !!state.onlineUsers[userId];
  });
};
