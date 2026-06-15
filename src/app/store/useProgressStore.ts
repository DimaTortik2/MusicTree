import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { contentConfig } from '@/contentConfig';

export interface TestResult {
  score: number;
  maxScore: number;
  userAnswers: number[][];
}
export type UISize = 'xs' | 'sm' | 'md' | 'lg';

export interface AppState {
  // Прогресс
  passedLessons: string[];
  passedHomeworks: string[];
  unlockedChains: string[];
  passedTests: Record<string, TestResult>;
  currentLesson: string | null;
  lastUncompletedLesson: string | null; // <-- НОВОЕ ПОЛЕ

  // Настройки
  theme: 'dark' | 'light';
  mediaVolume: number;
  pianoVolume: number;
  pianoBindings: Record<string, string | null>;
  uiSize: UISize;
  setUiSize: (size: UISize) => void;
  enableAmbientGlow: boolean;
  setEnableAmbientGlow: (state: boolean) => void;

  wallpaperMouseTracking: boolean;
  setWallpaperMouseTracking: (state: boolean) => void;

  // Tab Bar
  activeTabs: string[];
  inactiveTabs: string[];

  // Аудио
  audioRecordIds: string[];

  // Пианино
  isKeyboardPianoActive: boolean;

  leftOctaveShift: number;
  rightOctaveShift: number;

  pianoSoundType: 'synth' | 'acoustic';
  setPianoSoundType: (type: 'synth' | 'acoustic') => void;

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
  passHomework: (id: string) => void;
  returnHomeworkFromArchive: (id: string) => void;

  // Пианино
  setKeyboardPianoActive: (state: boolean) => void;
  setPianoVolume: (volume: number) => void;

  setLeftOctaveShift: (shift: number) => void;
  setRightOctaveShift: (shift: number) => void;

  setMediaVolume: (volume: number) => void;
  updatePianoBinding: (note: string, keyCode: string) => void;
  resetPianoBindings: () => void;

  showPianoHints: boolean;
  setShowPianoHints: (state: boolean) => void;

  isPianoMuted: boolean;
  previousPianoVolume: number;

  togglePianoMute: () => void;

  lessonScrollPositions: Record<string, number>;
  setLessonScrollPosition: (id: string, position: number) => void;
}

// Дефолтная раскладка по ТЗ (q2w3... и zsxd...)
const DEFAULT_PIANO_BINDINGS: Record<string, string | null> = {
  C4: 'KeyZ',
  'C#4': 'KeyS',
  D4: 'KeyX',
  'D#4': 'KeyD',
  E4: 'KeyC',
  F4: 'KeyV',
  'F#4': 'KeyG',
  G4: 'KeyB',
  'G#4': 'KeyH',
  A4: 'KeyN',
  'A#4': 'KeyJ',
  B4: 'KeyM',
  C5: 'KeyY',
  'C#5': 'Digit7',
  D5: 'KeyU',
  'D#5': 'Digit8',
  E5: 'KeyI',
  F5: 'KeyO',
  'F#5': 'Digit0',
  G5: 'KeyP',
  'G#5': 'Minus', // Клавиша "-"
  A5: 'BracketLeft', // Клавиша "[" (Левая квадратная скобка)
  'A#5': 'Equal', // Клавиша "="
  B5: 'BracketRight', // Клавиша "]" (Правая квадратная скобка)
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
      lastUncompletedLesson: 'lesson_1', // <-- Инициализируем первым уроком

      theme: 'dark', // Жесткий старт с темной темы по ТЗ
      mediaVolume: 50,
      pianoVolume: 50,
      isPianoMuted: false,
      previousPianoVolume: 50,
      pianoBindings: DEFAULT_PIANO_BINDINGS,
      uiSize: 'md',

      activeTabs: ['tree', 'lesson', 'homeworks', 'vocal', 'piano'],
      inactiveTabs: ['chains', 'tests', 'friends', 'debug', 'settings', 'customize'],
      audioRecordIds: [],

      isKeyboardPianoActive: false,
      showPianoHints: true,
      leftOctaveShift: 0,
      rightOctaveShift: 0,

      _hasHydrated: false,

      lessonScrollPositions: {},

      // Экшены
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setUiSize: (size) => set({ uiSize: size }),
      passLesson: (id) =>
        set((state) => ({
          passedLessons: [...new Set([...state.passedLessons, id])],
        })),

      setLessonScrollPosition: (id, position) =>
        set((state) => ({
          lessonScrollPositions: {
            ...(state.lessonScrollPositions || {}),
            [id]: position,
          },
        })),

      setCurrentLesson: (id) =>
        set((state) => {
          const isPassed = state.passedLessons.includes(id);
          return {
            currentLesson: id,
            // Если кликнули на пройденный, оставляем старый lastUncompletedLesson
            lastUncompletedLesson: isPassed ? state.lastUncompletedLesson : id,
          };
        }),

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
      passHomework: (id) =>
        set((state) => ({
          passedHomeworks: [...new Set([...state.passedHomeworks, id])],
        })),

      returnHomeworkFromArchive: (id) =>
        set((state) => ({
          passedHomeworks: state.passedHomeworks.filter((hwId) => hwId !== id),
        })),

      setKeyboardPianoActive: (state) => set({ isKeyboardPianoActive: state }),
      setPianoVolume: (volume) => set({ pianoVolume: volume, isPianoMuted: false }),
      setLeftOctaveShift: (shift) => set({ leftOctaveShift: shift }),
      setRightOctaveShift: (shift) => set({ rightOctaveShift: shift }),
      setMediaVolume: (volume) => set({ mediaVolume: volume }),

      updatePianoBinding: (note, keyCode) =>
        set((state) => {
          const newBindings = { ...state.pianoBindings };

          // Проверка на уникальность: если эта кнопка уже привязана к другой ноте, сбрасываем старую
          for (const [existingNote, boundKey] of Object.entries(newBindings)) {
            if (boundKey === keyCode) {
              newBindings[existingNote] = null;
            }
          }

          newBindings[note] = keyCode;
          return { pianoBindings: newBindings };
        }),

      pianoSoundType: 'synth', // по умолчанию синтезатор
      setPianoSoundType: (type) => set({ pianoSoundType: type }),
      enableAmbientGlow: true,
      setEnableAmbientGlow: (state) => set({ enableAmbientGlow: state }),

      wallpaperMouseTracking: true,
      setWallpaperMouseTracking: (state) => set({ wallpaperMouseTracking: state }),

      resetPianoBindings: () => set({ pianoBindings: DEFAULT_PIANO_BINDINGS }),
      setShowPianoHints: (state) => set({ showPianoHints: state }),
      togglePianoMute: () =>
        set((state) => {
          // Считаем пианино "замьюченным", если включен флаг ИЛИ громкость вручную скручена в 0
          const effectivelyMuted = state.isPianoMuted || state.pianoVolume === 0;

          if (effectivelyMuted) {
            // РАЗМЬЮТ: возвращаем предыдущую громкость (если она была 0, ставим дефолтные 50)
            const restoreVol = state.previousPianoVolume > 0 ? state.previousPianoVolume : 50;
            return {
              isPianoMuted: false,
              pianoVolume: restoreVol,
            };
          } else {
            // МЬЮТ: запоминаем текущую громкость и скручиваем ползунок в 0
            return {
              isPianoMuted: true,
              previousPianoVolume: state.pianoVolume,
              pianoVolume: 0,
            };
          }
        }),
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
        const state = persistedState as AppState;

        // МИГРАЦИЯ: Если юзер пришел с версии 1, добавляем ему вкладку friends в неактивные
        if (version < 2) {
          if (!state.activeTabs.includes('friends') && !state.inactiveTabs.includes('friends')) {
            state.inactiveTabs = ['friends', ...state.inactiveTabs];
          }
        }

        return state;
      },
    },
  ),
);
