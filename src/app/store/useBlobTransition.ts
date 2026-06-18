import { create } from "zustand";
export type TransitionDirection = "up" | "down" | "left" | "right";

interface BlobTransitionStore {
  isActive: boolean;
  callback: (() => void) | null;
  startTransition: (cb: () => void) => void;
  clearTransition: () => void;
  direction: TransitionDirection;
}

export const useBlobTransition = create<BlobTransitionStore>((set) => ({
  isActive: false,
  callback: null,
  direction: "up",
  startTransition: (cb) => set({ isActive: true, callback: cb }),
  clearTransition: () => set({ isActive: false, callback: null }),
}));
