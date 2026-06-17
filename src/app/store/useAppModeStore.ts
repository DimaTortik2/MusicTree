import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FriendProfile } from '@/features/friends/hooks/useFriends';

interface AppModeState {
  activeSharedFriend: FriendProfile | null;
  sharedTreeId: string | null;
  setSharedMode: (friend: FriendProfile, treeId: string) => void;
  exitSharedMode: () => void;
}

export const useAppModeStore = create<AppModeState>()(
  persist(
    (set) => ({
      activeSharedFriend: null,
      sharedTreeId: null,
      setSharedMode: (friend, treeId) => set({ activeSharedFriend: friend, sharedTreeId: treeId }),
      exitSharedMode: () => set({ activeSharedFriend: null, sharedTreeId: null }),
    }),
    {
      name: 'music-tree-app-mode',
      storage: createJSONStorage(() => localStorage),
    }
  )
);