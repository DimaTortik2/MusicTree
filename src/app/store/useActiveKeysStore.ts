import { create } from 'zustand';

interface ActiveKeysState {
  activeKeys: Set<string>;
  addKey: (key: string) => void;
  removeKey: (key: string) => void;
  clearKeys: () => void;
  mobileScrollPercent: number | null;
  setMobileScrollPercent: (percent: number) => void;

  // ✨ Стейты для загрузки акустики
  isPianoLoading: boolean;
  setIsPianoLoading: (state: boolean) => void;
  pianoLoadProgress: number;
  setPianoLoadProgress: (progress: number) => void;
}

export const useActiveKeysStore = create<ActiveKeysState>((set) => ({
  activeKeys: new Set(),
  addKey: (key) =>
    set((state) => {
      const newKeys = new Set(state.activeKeys);
      newKeys.add(key);
      return { activeKeys: newKeys };
    }),
  removeKey: (key) =>
    set((state) => {
      const newKeys = new Set(state.activeKeys);
      newKeys.delete(key);
      return { activeKeys: newKeys };
    }),
  clearKeys: () => set({ activeKeys: new Set() }),
  mobileScrollPercent: null,
  setMobileScrollPercent: (percent) => set({ mobileScrollPercent: percent }),

  // Инициализация загрузки
  isPianoLoading: false,
  setIsPianoLoading: (state) => set({ isPianoLoading: state }),
  pianoLoadProgress: 0,
  setPianoLoadProgress: (progress) => set({ pianoLoadProgress: progress }),
}));
