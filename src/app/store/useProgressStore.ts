// src/app/store/useProgressStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';

interface ProgressState {
  passedLessons: string[];
  currentLesson: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  // Экшены для тестов/работы (можешь вызывать их для проверки)
  passLesson: (id: string) => void;
  setCurrentLesson: (id: string) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      passedLessons: ['lesson_1', 'lesson_2'], // Моковые данные пройденных уроков
      currentLesson: 'lesson_3', // Моковый "текущий" урок
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      passLesson: (id) =>
        set((state) => ({
          passedLessons: [...new Set([...state.passedLessons, id])],
        })),
      setCurrentLesson: (id) => set({ currentLesson: id }),
    }),
    {
      name: 'music-tree-progress',
      version: 1, // Требование ТЗ
      onRehydrateStorage: () => (state) => {
        // Garbage Collector: Очищаем БД, если прогресс был удален
        if (state && state.passedLessons.length === 0) {
          localforage.clear().catch(console.error);
        }
        state?.setHasHydrated(true);
      },
      migrate: (persistedState: any, version) => {
        console.log(version);
        // Место для миграций при смене version
        return persistedState;
      },
    },
  ),
);
