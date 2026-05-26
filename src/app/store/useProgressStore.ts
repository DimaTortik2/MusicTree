import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { contentConfig } from '@/contentConfig';

export interface TestResult {
  score: number;
  maxScore: number;
  userAnswers: number[][];
}

export interface AppState {
  // Прогресс
  passedLessons: string[];
  passedHomeworks: string[];
  unlockedChains: string[];
  passedTests: Record<string, TestResult>;
  currentLesson: string | null;

  // Настройки
  theme: 'dark' | 'light';
  mediaVolume: number;
  pianoVolume: number;
  pianoBindings: Record<string, string | null>;

  // Tab Bar
  activeTabs: string[];
  inactiveTabs: string[];

  // Аудио
  audioRecordIds: string[];

  // Техническое
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Экшены
  passLesson: (id: string) => void;
  setCurrentLesson: (id: string) => void;
  passTest: (testId: string, result: TestResult) => void;
  clearTestResult: (testId: string) => void;
  setActiveTabs: (tabs: string[]) => void;
  setInactiveTabs: (tabs: string[]) => void;
}

// Дефолтная раскладка по ТЗ (q2w3... и zsxd...)
const DEFAULT_PIANO_BINDINGS: Record<string, string | null> = {
  C4: 'KeyQ',
  'C#4': 'Digit2',
  D4: 'KeyW',
  'D#4': 'Digit3',
  E4: 'KeyE',
  F4: 'KeyR',
  'F#4': 'Digit5',
  G4: 'KeyT',
  'G#4': 'Digit6',
  A4: 'KeyY',
  'A#4': 'Digit7',
  B4: 'KeyU',
  C5: 'KeyZ',
  'C#5': 'KeyS',
  D5: 'KeyX',
  'D#5': 'KeyD',
  E5: 'KeyC',
  F5: 'KeyV',
  'F#5': 'KeyG',
  G5: 'KeyB',
  'G#5': 'KeyH',
  A5: 'KeyN',
  'A#5': 'KeyJ',
  B5: 'KeyM',
};

export const useProgressStore = create<AppState>()(
  persist(
    (set) => ({
      // Инициализация пустых данных (у новых юзеров ничего не пройдено)
      passedLessons: [],
      passedHomeworks: [],
      unlockedChains: [],
      passedTests: {},
      currentLesson: 'lesson_1', // Начинаем с Введения

      theme: 'dark', // Жесткий старт с темной темы по ТЗ
      mediaVolume: 50,
      pianoVolume: 50,
      pianoBindings: DEFAULT_PIANO_BINDINGS,

      activeTabs: ['tree', 'lesson', 'homeworks', 'vocal', 'piano'],
      inactiveTabs: ['chains', 'tests', 'exam', 'debug', 'settings', 'customize'],
      audioRecordIds: [],

      _hasHydrated: false,

      // Экшены
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      passLesson: (id) =>
        set((state) => ({
          passedLessons: [...new Set([...state.passedLessons, id])],
        })),

      setCurrentLesson: (id) => set({ currentLesson: id }),

      passTest: (testId, result) =>
        set((state) => ({
          passedTests: {
            ...state.passedTests,
            [testId]: result,
          },
        })),

      clearTestResult: (testId) =>
        set((state) => {
          const newTests = { ...state.passedTests };
          delete newTests[testId];
          return { passedTests: newTests };
        }),
      setActiveTabs: (tabs) => set({ activeTabs: tabs }),
      setInactiveTabs: (tabs) => set({ inactiveTabs: tabs }),
    }),
    {
      name: 'music-tree-progress',
      version: 1, // Версионирование по ТЗ
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // --- 1. Garbage Collector (Сборщик мусора для IndexedDB) ---
        if (state.audioRecordIds.length === 0) {
          localforage.clear().catch(console.error);
        }

        // --- 2. Фильтрация "мертвых" ID из localStorage ---
        const validLessonIds = new Set(contentConfig.map((c) => c.id));
        const validTestIds = new Set(contentConfig.flatMap((c) => c.linkedTests));

        let needsUpdate = false;

        // Чистим уроки
        const cleanPassedLessons = state.passedLessons.filter((id) => validLessonIds.has(id));
        if (cleanPassedLessons.length !== state.passedLessons.length) needsUpdate = true;

        // Чистим тесты
        const cleanPassedTests: Record<string, TestResult> = {};
        for (const [testId, result] of Object.entries(state.passedTests)) {
          if (validTestIds.has(testId)) {
            cleanPassedTests[testId] = result;
          } else {
            needsUpdate = true;
          }
        }

        // Если нашли несоответствия, тихо обновляем стейт без участия юзера
        if (needsUpdate) {
          useProgressStore.setState({
            passedLessons: cleanPassedLessons,
            passedTests: cleanPassedTests,
          });
        }

        // Разблокируем рендер приложения
        state.setHasHydrated(true);
      },
      migrate: (persistedState: any, version) => {
        // Задел на будущее. Если сменится version (например, на 2),
        // здесь можно перегонять старую схему данных в новую.
        console.log(version);
        return persistedState as AppState;
      },
    },
  ),
);
